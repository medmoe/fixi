# src/app/api/v1/users.py

from typing import Annotated, cast
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser, get_current_user
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import ForbiddenException, NotFoundException
from ...core.security import blacklist_token, oauth2_scheme
from ...crud.crud_users import crud_users
from ...schemas.user import UserRead, UserUpdate, UserPasswordUpdate

router = APIRouter(tags=["users"])


# ─── private helper ───────────────────────────────────────────────────────────

def _assert_same_user(username: str, current_user: dict) -> None:
    """Raise 403 if current user is not the owner."""
    if username != current_user["username"]:
        raise ForbiddenException()


# ─── GET /user/me ─────────────────────────────────────────────────────────────

@router.get("/user/me", response_model=UserRead)
async def read_user_me(
    current_user: Annotated[dict, Depends(get_current_user)],
) -> dict:
    """Return the authenticated user's own profile."""
    return current_user


# ─── GET /user/{username} ─────────────────────────────────────────────────────

@router.get("/user/{username}", response_model=UserRead)
async def read_user(
    username: str,
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> UserRead:
    """Public — get any user's profile by username."""
    db_user = await crud_users.get(
        db=db,
        username=username,
        is_deleted=False,
        schema_to_select=UserRead,
        return_as_model=True,
    )
    if db_user is None:
        raise NotFoundException("User not found.")
    return cast(UserRead, db_user)


# ─── PATCH /user/{username} ───────────────────────────────────────────────────

@router.patch("/user/{username}", response_model=UserRead)
async def update_user(
    username: str,
    values: UserUpdate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> UserRead:
    """Update own account — name, username, email, avatar, location."""
    _assert_same_user(username, current_user)

    # verify user exists and is active
    db_user = await crud_users.get(db=db, username=username, is_deleted=False)
    if db_user is None:
        raise NotFoundException("User not found.")

    # skip duplicate checks if value unchanged
    current_email = db_user["email"] if isinstance(db_user, dict) else db_user.email
    current_username = db_user["username"] if isinstance(db_user, dict) else db_user.username

    if values.email == current_email:
        values = values.model_copy(update={"email": None})
    if values.username == current_username:
        values = values.model_copy(update={"username": None})

    await crud_users.update(db=db, object=values, username=username)

    updated = await crud_users.get(
        db=db,
        username=values.username or username,
        schema_to_select=UserRead,
        return_as_model=True,
    )
    return cast(UserRead, updated)


# ─── PATCH /user/{username}/password ─────────────────────────────────────────

@router.patch("/user/{username}/password")
async def change_password(
    username: str,
    payload: UserPasswordUpdate,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    """Change own password — requires current password verification."""
    _assert_same_user(username, current_user)
    await crud_users.change_password(db=db, username=username, payload=payload)
    return {"message": "Password updated successfully."}


# ─── DELETE /user/{username} — soft delete (deactivate) ──────────────────────

@router.delete("/user/{username}")
async def deactivate_user(
    username: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(async_get_db)],
    token: str = Depends(oauth2_scheme),
) -> dict[str, str]:
    """Deactivate own account — soft delete, blacklists token."""
    _assert_same_user(username, current_user)
    await crud_users.deactivate(db=db, username=username)
    await blacklist_token(token=token, db=db)
    return {"message": "Account deactivated successfully."}


# ─── DELETE /user/{username}/hard — hard delete (superuser only) ──────────────

@router.delete(
    "/user/{username}/hard",
    dependencies=[Depends(get_current_superuser)],
)
async def hard_delete_user(
    username: str,
    db: Annotated[AsyncSession, Depends(async_get_db)],
    token: str = Depends(oauth2_scheme),
) -> dict[str, str]:
    """Permanently delete user — GDPR, superuser only."""
    await crud_users.hard_delete(db=db, username=username)
    await blacklist_token(token=token, db=db)
    return {"message": "User permanently deleted."}