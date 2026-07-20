from datetime import UTC, datetime
from typing import Any

from fastcrud import FastCRUD
from sqlalchemy.engine.row import Row
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import User, WorkerProfile
from ..schemas.worker_profile import WorkerProfileCreate, WorkerProfileDelete, WorkerProfileRead, WorkerProfileUpdate, WorkerProfileUpdateInternal


class CRUDWorker(FastCRUD[
    WorkerProfile,
    WorkerProfileCreate,
    WorkerProfileUpdate | WorkerProfileUpdateInternal,
    WorkerProfileUpdateInternal,
    WorkerProfileDelete,
    WorkerProfileRead
]):
    async def delete(
            self,
            db: AsyncSession,
            db_row: Row | None = None,
            allow_multiple: bool = False,
            commit: bool = True,
            filters: WorkerProfileDelete | None = None,
            **kwargs: Any,
    ) -> None:
        user_id = kwargs.get("user_id")
        hard = kwargs.get("hard", False)
        if not isinstance(user_id, int):
            raise ValueError("user_id must be provided as a keyword argument.")

        user = await db.get(User, user_id)
        if not user:
            raise NoResultFound("User does not exist.")

        if not await self.exists(db=db, user_id=user_id):
            raise NoResultFound("Worker profile does not exist.")

        if hard:
            await db.delete(user)
        else:
            user.is_deleted = True
            user.deleted_at = datetime.now(UTC)

        await db.commit()

    async def update(
            self,
            db: AsyncSession,
            object: WorkerProfileUpdate | WorkerProfileUpdateInternal | dict[str, Any],
            **kwargs: Any,
    ) -> Any:
        user_id = kwargs.get("user_id")
        if not isinstance(user_id, int):
            raise ValueError("user_id must be provided as a keyword argument.")

        user = await db.get(User, user_id)
        if not user:
            raise NoResultFound("User does not exist.")

        user.updated_at = datetime.now(UTC)
        await db.flush()

        return await super().update(db=db, object=object, **kwargs)


crud_worker_profiles = CRUDWorker(WorkerProfile)
