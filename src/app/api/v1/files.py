import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastcrud.exceptions.http_exceptions import DuplicateValueException
from sqlalchemy.ext.asyncio import AsyncSession

from ..utils import lookup_user_by_username
from ...api.dependencies import get_current_user
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import NotFoundException
from ...core.security import validate_mime_type
from ...crud.crud_files import FileCreate, FileRead, FileUpdate, crud_files, FileCreateInternal, FileUpdateInternal
from ...services.minio_client import minio_client

router = APIRouter(tags=["files"])
logger = logging.getLogger(__name__)


@router.post("/{username}/file", response_model=FileRead, status_code=201)
async def write_file(
        username: str,
        file: FileCreate,
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
):
    """
    Create a new file metadata record and generate a presigned upload URL.
    The client will then upload the actual file to storage using that URL.
    """
    db_user = await lookup_user_by_username(db=db, username=username, current_user=current_user)

    file_internal_dict = file.model_dump()
    file_internal_dict["belongs_to_user_id"] = db_user.id
    file_internal_dict['file_key'] = f"{uuid.uuid1()}/{file_internal_dict['original_file_name']}"
    file_internal = FileCreateInternal(**file_internal_dict)

    if await crud_files.exists(db=db, file_key=file_internal.file_key):
        raise DuplicateValueException("File already exists")

    return await crud_files.create(db=db, object=file_internal)


@router.post("/{file_id}/upload", status_code=200)
async def upload_file_content(
        file_id: int,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        upload_file: Annotated[UploadFile, File(...)]
):
    file_record = await crud_files.get(db=db, id=file_id, is_deleted=False)
    if file_record is None:
        raise NotFoundException("File not found")

    # Read the file metadata from upload_file
    filename = upload_file.filename
    try:
        contents = await upload_file.read()
        detected_mime = validate_mime_type(contents, filename)
        minio_client.upload_file(
            bucket=minio_client.bucket_uploads,
            key=file_record['file_key'],
            data=contents,
            content_type=detected_mime,
        )


        file_update_internal = FileUpdateInternal(is_processed=True, is_safe=True)
        await crud_files.update(db=db, object=file_update_internal, id=file_record['id'])

        return {"url": f"http://localhost:9000/{minio_client.bucket_uploads}/{file_record['file_key']}"}

    except HTTPException: # Preserve exceptions raised when calling validate_mime_type() if any.
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {e}"
        )


@router.patch("/files/{file_id}", response_model=FileRead)
async def update_file(
        file_id: int,
        file_in: FileUpdate,
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
):
    """
    Update file metadata (e.g., mark is_processed, is_safe, etc.).
    Only superusers may perform this.
    """
    try:
        file_out = await crud_files.update(file_id=file_id, file_update=file_in, db_session=db)

    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))

    return file_out
