# src/app/crud/crud_users.py

from datetime import UTC, datetime
from typing import Any

from fastcrud import FastCRUD, PaginatedListResponse
from fastcrud.exceptions.http_exceptions import NotFoundException
from sqlalchemy import ColumnElement, and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions.http_exceptions import DuplicateValueException
from ..core.security import get_password_hash, verify_password
from ..models import User
from ..schemas.user import (
    UserAdminFilter,
    UserCreateInternal,
    UserDeleteInternal,
    UserPasswordUpdate,
    UserRead,
    UserUpdate,
    UserUpdateInternal,
)
from ..schemas.utils import build_wkt_point


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
        """Update user fields — automatically sets updated_at and location"""
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

        latitude = update_data.pop('latitude', None)
        longitude = update_data.pop('longitude', None)
        internal = UserUpdateInternal(
            **update_data,
            updated_at=datetime.now(UTC).replace(tzinfo=None),
            location=build_wkt_point(latitude, longitude),
        )

        # fastcrud builds its RETURNING clause from bare column names, so
        # PostGISPoint.column_expression (ST_AsText) never renders and `location`
        # would come back as raw EWKB hex. Update without RETURNING, then re-SELECT
        # through the ORM columns so the geometry is decoded to WKT.
        wants_return = bool(return_columns or schema_to_select or return_as_model)

        # resolve target ids first: the filters may match on fields this update changes
        target_ids: list[int] = []
        if wants_return:
            matched = await self.get_multi(db=db, limit=None, **kwargs)
            target_ids = [row["id"] for row in matched["data"]]

        await super().update(
            db=db,
            object=internal,
            allow_multiple=allow_multiple,
            commit=commit,
            **kwargs,
        )

        if not wants_return:
            return None

        if allow_multiple:
            if not target_ids:
                return {"data": []}
            fetched = await self.get_multi(
                db=db,
                limit=None,
                schema_to_select=schema_to_select,
                return_as_model=return_as_model,
                id__in=target_ids,
            )
            return {"data": [self._trim_to_return_columns(row, return_columns) for row in fetched["data"]]}

        if not target_ids:
            return None

        row = await self.get(
            db=db,
            id=target_ids[0],
            schema_to_select=schema_to_select,
            return_as_model=return_as_model,
            one_or_none=one_or_none,
        )
        return self._trim_to_return_columns(row, return_columns)

    @staticmethod
    def _trim_to_return_columns(row: Any, return_columns: list[str] | None) -> Any:
        """Honor an explicit return_columns subset; models and None pass through."""
        if not return_columns or not isinstance(row, dict):
            return row
        return {key: value for key, value in row.items() if key in return_columns}

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

    async def suspend(
            self,
            db: AsyncSession,
            user_id: int,
    ) -> None:
        """Admin action -- distinct from deactivate (self-service, effectively
        permanent soft delete). Reversible via reactivate."""
        user = await self.exists(db=db, id=user_id, is_deleted=False)
        if not user:
            raise NotFoundException("User not found.")

        await super().update(
            db=db,
            object=UserUpdateInternal(is_suspended=True, updated_at=datetime.now(UTC).replace(tzinfo=None)),
            id=user_id,
        )

    async def reactivate(
            self,
            db: AsyncSession,
            user_id: int,
    ) -> None:
        """Reverses suspend."""
        user = await self.exists(db=db, id=user_id, is_deleted=False)
        if not user:
            raise NotFoundException("User not found.")

        await super().update(
            db=db,
            object=UserUpdateInternal(is_suspended=False, updated_at=datetime.now(UTC).replace(tzinfo=None)),
            id=user_id,
        )

    async def search_users(
            self,
            db: AsyncSession,
            filters: UserAdminFilter,
            offset: int = 0,
            limit: int = 20,
    ) -> PaginatedListResponse[UserRead]:
        """Admin search across customers and workers -- Phase 8 Issue 4
        (Admin panel: user management). Mirrors CRUDWorker.search_workers'
        raw-query approach (a free-text OR across name/username/email isn't
        expressible through FastCRUD's generic kwargs filtering)."""
        # Admin accounts are admin-only (decision 004) -- they aren't
        # customers/workers to manage, so they're left out of this list.
        where_clauses: list[ColumnElement[bool]] = [User.is_deleted.is_(False), User.is_superuser.is_(False)]
        if filters.search:
            term = f"%{filters.search}%"
            where_clauses.append(or_(User.name.ilike(term), User.username.ilike(term), User.email.ilike(term)))
        if filters.role_type is not None:
            where_clauses.append(User.role_type == filters.role_type)
        if filters.is_suspended is not None:
            where_clauses.append(User.is_suspended.is_(filters.is_suspended))

        count_stmt = select(func.count(User.id)).select_from(User).where(and_(*where_clauses))
        total_count = (await db.execute(count_stmt)).scalar() or 0

        stmt = select(User).where(and_(*where_clauses)).order_by(User.id.asc()).offset(offset).limit(limit)
        result = await db.execute(stmt)
        users = result.scalars().all()

        data = [UserRead.model_validate(u) for u in users]
        return PaginatedListResponse(
            data=data,
            total_count=total_count,
            has_more=(offset + len(data)) < total_count,
            items_per_page=limit,
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
