from datetime import datetime, UTC

from fastcrud import FastCRUD
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import WorkerProfile, User
from ..schemas.worker_profile import (
    WorkerProfileCreate,
    WorkerProfileRead,
    WorkerProfileUpdate,
    WorkerProfileUpdateInternal,
    WorkerProfileDelete
)


class CRUDWorker(FastCRUD[
                     WorkerProfile,
                     WorkerProfileCreate,
                     WorkerProfileUpdate,
                     WorkerProfileUpdateInternal,
                     WorkerProfileDelete,
                     WorkerProfileRead
                 ]):
    async def delete(self, db: AsyncSession, user_id: int, hard: bool = False):
        user = await db.get(User, user_id)
        if not user:
            raise NoResultFound("The user does not exist")

        if hard:
            await db.delete(user)
        else:
            user.is_deleted = True

        await db.commit()

    async def update(self, db: AsyncSession, object: WorkerProfileUpdate, user_id: int, id: int) -> WorkerProfile:

        user = await db.get(User, user_id)
        if not user:
            raise NoResultFound("User does not exist.")

        # manually update User.updated_at
        user.updated_at = datetime.now(UTC)
        await db.flush()

        return await super().update(db=db, object=object, id=id)


crud_workers = CRUDWorker(WorkerProfile)
