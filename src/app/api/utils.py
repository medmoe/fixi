from typing import Annotated, cast

from fastapi import Depends
from fastcrud.exceptions.http_exceptions import ForbiddenException, NotFoundException
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.api.dependencies import get_current_user
from src.app.core.db.database import async_get_db
from src.app.crud.crud_users import crud_users
from src.app.schemas.user import UserRead


async def lookup_user_by_username(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        username: str,
        current_user: Annotated[dict, Depends(get_current_user)]
):
    db_user = await crud_users.get(db=db,
                                   username=username,
                                   is_deleted=False,
                                   schema_to_select=UserRead,
                                   return_as_model=True)
    if db_user is None:
        raise NotFoundException("User not found")

    db_user = cast(UserRead, db_user)
    if current_user['id'] != db_user.id:
        raise ForbiddenException()

    return db_user
