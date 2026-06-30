import datetime
import logging
import uuid
from typing import Annotated, cast

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastcrud import PaginatedListResponse, paginated_response
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_user
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import DuplicateValueException, ForbiddenException, NotFoundException
from ...core.security import validate_mime_type
from ...crud.crud_files import crud_files
from ...schemas.file import FileBase, FileCreate, FileRead, FileUpdateInternal
from ...services.minio_client import minio_client

router = APIRouter(tags=["files"])
logger = logging.getLogger(__name__)


@router.post("/files", response_model=FileRead, status_code=201)
async def write_file_metadata(
        file: FileBase,
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
):
    """
    Create a new file metadata record and generate a presigned upload URL.
    The client will then upload the actual file to storage using that URL.
    """

    file_internal_dict = file.model_dump()
    file_internal_dict["belongs_to_user_id"] = current_user['id']
    file_internal_dict['file_key'] = f"{uuid.uuid1()}/{file_internal_dict['original_file_name']}"
    file_internal = FileCreate(**file_internal_dict)

    if await crud_files.exists(db=db, file_key=file_internal.file_key):
        raise DuplicateValueException("File already exists")

    return await crud_files.create(db=db, object=file_internal, schema_to_select=FileRead, return_as_model=True)


@router.post("/files/{file_id}", status_code=200)
async def upload_file_content(
        file_id: int,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        upload_file: Annotated[UploadFile, File(...)],
        current_user: Annotated[dict, Depends(get_current_user)]
):
    file_record = await get_file_by_id(file_id, db)

    if file_record.belongs_to_user_id != current_user['id']:
        raise ForbiddenException()

    # Read the file metadata from upload_file
    filename = upload_file.filename or "unknown"
    try:
        contents = await upload_file.read()
        detected_mime = validate_mime_type(contents, filename)
        minio_client.upload_file(
            bucket=minio_client.bucket_uploads,
            key=file_record.file_key,
            data=contents,
            content_type=detected_mime,
        )

        updated_file = FileUpdateInternal(is_processed=True, is_safe=True)
        await crud_files.update(db=db, object=updated_file, id=file_record.id)

        return {"file_url": file_record.file_url}

    except HTTPException:  # Preserve exceptions raised when calling validate_mime_type() if any.
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {e}"
        )


@router.get("/files", response_model=PaginatedListResponse[FileRead], status_code=200)
async def get_files(current_user: Annotated[dict, Depends(get_current_user)],
                    db: Annotated[AsyncSession, Depends(async_get_db)],
                    page: int = 1,
                    files_per_page: int = 10):
    files = await crud_files.get_multi(db=db,
                                       belongs_to_user_id=current_user['id'],
                                       is_deleted=False,
                                       offset=(page - 1) * files_per_page,
                                       limit=files_per_page,
                                       schema_to_select=FileRead,
                                       return_as_model=False
                                       )
    return paginated_response(files, page, files_per_page)


@router.patch("/files/{file_id}", status_code=200)
async def update_file_content(
        file_id: int,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        upload_file: Annotated[UploadFile, File(...)],
        current_user: Annotated[dict, Depends(get_current_user)]
):
    """
    Replace the binary content of an existing file (e.g. user wants to change their photo).
    Keeps the same DB record / same file_id, just overwrites storage and updates metadata.
    """
    file_record = await get_file_by_id(file_id, db)
    if file_record.belongs_to_user_id != current_user['id']:
        raise ForbiddenException()

    # Read new file bytes
    try:
        contents = await upload_file.read()
        detected_mime = validate_mime_type(contents, upload_file.filename or "unknown")
        minio_client.upload_file(
            bucket=minio_client.bucket_uploads,
            key=file_record.file_key,
            data=contents,
            content_type=detected_mime,
        )

        updated_data = FileUpdateInternal(
            original_file_name=upload_file.filename,
            mime_type=detected_mime,
            is_processed=True,
            is_safe=True
        )
        await crud_files.update(db=db, object=updated_data, id=file_record.id)
        return {"file_url": file_record.file_url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {e}"
        )


@router.delete("/files/{file_id}", status_code=204)
async def delete_file(
        file_id: int,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        current_user: Annotated[dict, Depends(get_current_user)]
):
    """
    Delete a file that belongs to the current user.
    Marks the DB record as deleted but does not delete the actual file from storage.
    Returns 204 no Content.
    """
    file_record = await get_file_by_id(file_id, db)
    if file_record.belongs_to_user_id != current_user['id']:
        raise ForbiddenException()

    try:
        minio_client.delete_file(bucket=minio_client.bucket_uploads, key=file_record.file_key)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete file: {e}"
        )

    deleted_file = FileUpdateInternal(is_deleted=True,
                                      deleted_at=datetime.datetime.now(),
                                      is_processed=True,
                                      is_safe=True)
    await crud_files.update(db=db, object=deleted_file, id=file_record.id)
    return


async def get_file_by_id(file_id: int, db: AsyncSession) -> FileRead:
    file_record = await crud_files.get(db=db,
                                       id=file_id,
                                       is_deleted=False,
                                       schema_to_select=FileRead,
                                       return_as_model=True)
    if file_record is None:
        raise NotFoundException("File not found")

    return cast(FileRead, file_record)
