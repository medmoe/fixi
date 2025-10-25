import logging
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
    file_internal = FileCreateInternal(**file_internal_dict)

    if await crud_files.exists(db=db, file_key=file_internal.file_key):
        raise DuplicateValueException("File already exists")

    return await crud_files.create(db=db, object=file_internal)


@router.post("/{username}/file/upload", status_code=200)
async def upload_file_content(
        username: str,
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
        upload_file: Annotated[UploadFile, File(...)]
):
    db_user = await lookup_user_by_username(db=db, username=username, current_user=current_user)

    # Read the file metadata from upload_file
    filename = upload_file.filename
    try:
        contents = await upload_file.read()
        detected_mime = validate_mime_type(contents, filename)
        minio_client.upload_file(
            bucket=minio_client.bucket_uploads,
            key=f"{db_user.id}/{filename}",
            data=contents,
            content_type=detected_mime,
        )





    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {e}"
        )


# @router.get("/files", response_model=PaginatedListResponse[FileRead], status_code=200)
# async def get_user_files(request: Request,
#                          current_user: Annotated[dict, Depends(get_current_user)],
#                          db: Annotated[AsyncSession, Depends(async_get_db)],
#                          page: Annotated[int, Query(ge=1)] = 1,
#                          items_per_page: Annotated[int, Query(ge=1, le=100)] = 10
#                          ):
#     user_id = current_user["id"]
#
#     # Fetch paginated list via crud
#     crud_data = await crud_files.get_multi(
#         db=db,
#         offset=compute_offset(page, items_per_page),
#         limit=items_per_page,
#         belongs_to_user_id=user_id,
#         is_deleted=False,
#     )
#     return paginated_response(
#         crud_data=crud_data,
#         page=page,
#         items_per_page=items_per_page,
#     )


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
