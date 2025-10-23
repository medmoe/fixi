from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastcrud.paginated import PaginatedListResponse, compute_offset, paginated_response
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_user
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import DuplicateValueException, NotFoundException
from ...crud.crud_files import FileCreate, FileRead, FileUpdate, crud_files

router = APIRouter(tags=["files"])


@router.post("/files", response_model=FileRead, status_code=201)
async def write_file(
        request: Request,
        file: FileCreate,
        current_user: Annotated[dict, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(async_get_db)],
):
    """
    Create a new file metadata record and generate a presigned upload URL.
    The client will then upload the actual file to storage using that URL.
    """
    try:
        file_out = await crud_files.create_for_user(user_id=current_user["id"], file_create=file, db_session=db)
    except DuplicateValueException as e:
        raise HTTPException(status_code=409, detail=str(e))

    return file_out


@router.get("/files", response_model=PaginatedListResponse[FileRead], status_code=200)
async def get_user_files(request: Request,
                         current_user: Annotated[dict, Depends(get_current_user)],
                         db: Annotated[AsyncSession, Depends(async_get_db)],
                         page: Annotated[int, Query(ge=1)] = 1,
                         items_per_page: Annotated[int, Query(ge=1, le=100)] = 10,
                         ):
    user_id = current_user["id"]

    # Fetch paginated list via crud
    crud_data = await crud_files.get_multi(
        db=db,
        offset=compute_offset(page, items_per_page),
        limit=items_per_page,
        belongs_to_user_id=user_id,
        is_deleted=False,
    )
    return paginated_response(
        crud_data=crud_data,
        page=page,
        items_per_page=items_per_page,
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
