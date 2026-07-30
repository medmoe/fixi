# src/app/crud/crud_users.py

from datetime import UTC, datetime
from typing import Any

from fastcrud import FastCRUD
from fastcrud.exceptions.http_exceptions import NotFoundException
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions.http_exceptions import DuplicateValueException
from ..core.security import get_password_hash, verify_password
from ..models import User
from ..schemas.user import (
    UserCreateInternal,
    UserDeleteInternal,
    UserPasswordUpdate,
    UserRead,
    UserUpdate,
    UserUpdateInternal,
)


class CRUDUser(FastCRUD[
    User,
    UserCreateInternal,
    UserUpdate,
    UserUpdateInternal,
    UserDeleteInternal,
    UserRead,
]):
    async def update(
            self,
            db: AsyncSession,
            object: UserUpdate | dict[str, Any],
            *,
            allow_multiple: bool = False,
            commit: bool = True,
            return_columns: list[str] | None = None,
            schema_to_select: type[UserRead] | None = None,
            return_as_model: bool = False,
            one_or_none: bool = False,
            **kwargs: Any,
    ) -> Any:
        """Update user fields — automatically sets updated_at."""
        # check duplicate email if being changed
        if isinstance(object, UserUpdate) and object.email is not None:
            existing = await self.exists(db=db, email=object.email)
            if existing:
                raise DuplicateValueException("Email is already registered.")

        # check duplicate username if being changed
        if isinstance(object, UserUpdate) and object.username is not None:
            existing = await self.exists(db=db, username=object.username)
            if existing:
                raise DuplicateValueException("Username not available.")

        # build internal update with updated_at
        update_data = (
            object if isinstance(object, dict)
            else object.model_dump(exclude_unset=True, mode="json")
        )

        # convert lat/lng to PostGIS point
        if isinstance(object, UserUpdate) and object.latitude is not None and object.longitude is not None:
            point = ST_SetSRID(ST_MakePoint(object.longitude, object.latitude), 4326)

        internal = UserUpdateInternal(
            **update_data,
            updated_at=datetime.now(UTC).replace(tzinfo=None),
        )

        return await super().update(
            db=db,
            object=internal,
            allow_multiple=allow_multiple,
            commit=commit,
            return_columns=return_columns,
            schema_to_select=schema_to_select,
            return_as_model=return_as_model,
            one_or_none=one_or_none,
            **kwargs,
        )

    async def change_password(
            self,
            db: AsyncSession,
            username: str,
            payload: UserPasswordUpdate,
    ) -> None:
        """Verify current password then update to new hashed password."""
        user = await self.get(db=db, username=username, is_deleted=False)
        if user is None:
            raise NotFoundException("User not found.")

        hashed = user["hashed_password"] if isinstance(user, dict) else user.hashed_password

        if not await verify_password(payload.current_password, hashed):
            raise ValueError("Current password is incorrect.")

        new_hashed = get_password_hash(payload.new_password)

        await super().update(
            db=db,
            object=UserUpdateInternal(
                hashed_password=new_hashed,
                updated_at=datetime.now(UTC).replace(tzinfo=None),
            ),
            username=username,
        )

    async def deactivate(
            self,
            db: AsyncSession,
            username: str,
    ) -> None:
        """Soft delete — sets is_deleted=True and deleted_at timestamp."""
        user = await self.exists(db=db, username=username, is_deleted=False)
        if not user:
            raise NotFoundException("User not found.")

        await super().update(
            db=db,
            object=UserUpdateInternal(
                is_deleted=True,
                deleted_at=datetime.now(UTC).replace(tzinfo=None),
                updated_at=datetime.now(UTC).replace(tzinfo=None),
            ),
            username=username,
        )

    async def hard_delete(
            self,
            db: AsyncSession,
            username: str,
    ) -> None:
        """Permanent deletion — GDPR compliance, superuser only."""
        user = await self.exists(db=db, username=username)
        if not user:
            raise NotFoundException("User not found.")

        await self.db_delete(db=db, username=username)


crud_users = CRUDUser(User)
