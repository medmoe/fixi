from datetime import UTC, datetime
from typing import Any

from fastcrud import FastCRUD
from sqlalchemy.engine.row import Row
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions.http_exceptions import DuplicateValueException
from ..models import User, WorkerProfile
from ..schemas.user import UserRead
from ..schemas.worker_profile import WorkerProfileBase, WorkerProfileCreate, WorkerProfileDelete, WorkerProfileNestedRead, WorkerProfileUpdate, WorkerProfileUpdateInternal
from .crud_users import crud_users


class CRUDWorker(FastCRUD[WorkerProfile, WorkerProfileCreate, WorkerProfileUpdate, WorkerProfileUpdateInternal, WorkerProfileDelete, WorkerProfileNestedRead]):

    async def create(  # type: ignore[override] # FastCRUD overloads can't be satisfied by a single implementation.
            self,
            db: AsyncSession,
            object: WorkerProfileCreate,
            commit: bool = True,
            schema_to_select: type[WorkerProfileNestedRead] | None = WorkerProfileNestedRead,
            return_as_model: bool = True
    ) -> WorkerProfileNestedRead:
        user = await crud_users.get(db=db, id=object.user_id, schema_to_select=UserRead, return_as_model=True)

        if user is None:
            raise NoResultFound("User does not exist.")

        if await self.exists(db=db, user_id=object.user_id):
            raise DuplicateValueException("Each user can only have one worker profile.")

        db_object = WorkerProfile(**object.model_dump(mode="json"))
        db.add(db_object)
        if commit:
            await db.commit()
            await db.refresh(db_object)
        return WorkerProfileNestedRead(**WorkerProfileBase.model_validate(db_object).model_dump(), id=db_object.id, is_verified=db_object.is_verified, user=user)

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
            object: WorkerProfileUpdate | dict[str, Any],
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

# from sqlalchemy.dialects.postgresql import insert  # or sqlite, depending on your DB
#
# async def bulk_create(
#     self,
#     db: AsyncSession,
#     objects: list[WorkerProfileCreate],
#     user_ids: list[int],
# ) -> list[WorkerProfile]:
#     if len(objects) != len(user_ids):
#         raise ValueError("objects and user_ids must have the same length.")
#
#     # verify all users exist in one query
#     existing_users = await db.execute(
#         select(User.id).where(User.id.in_(user_ids))
#     )
#     found_user_ids = {row.id for row in existing_users}
#     missing = set(user_ids) - found_user_ids
#     if missing:
#         raise ValueError(f"Users do not exist: {missing}")
#
#     # check for duplicate user_ids in the input itself
#     if len(user_ids) != len(set(user_ids)):
#         raise ValueError("Duplicate user_ids in input.")
#
#     # check for existing profiles in one query
#     existing_profiles = await db.execute(
#         select(WorkerProfile.user_id).where(WorkerProfile.user_id.in_(user_ids))
#     )
#     already_exists = {row.user_id for row in existing_profiles}
#     if already_exists:
#         raise DuplicateValueException(f"Profiles already exist for users: {already_exists}")
#
#     # build list of dicts for bulk insert
#     rows = [
#         {**obj.model_dump(mode="json"), "user_id": user_id}
#         for obj, user_id in zip(objects, user_ids)
#     ]
#
#     # single INSERT for all rows
#     await db.execute(insert(WorkerProfile), rows)
#     await db.commit()  # single commit ✅
#
#     # fetch the inserted profiles in one query
#     result = await db.execute(
#         select(WorkerProfile).where(WorkerProfile.user_id.in_(user_ids))
#     )
#     return result.scalars().all()
