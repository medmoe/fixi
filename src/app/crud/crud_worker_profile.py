from datetime import UTC, datetime

from fastcrud import FastCRUD
from fastcrud.exceptions.http_exceptions import DuplicateValueException
from sqlalchemy import and_, select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import User, WorkerProfile
from ..schemas.worker_profile import WorkerProfileCreate, WorkerProfileDelete, WorkerProfileRead, WorkerProfileUpdate, WorkerProfileUpdateInternal
from .crud_users import crud_users


class CRUDWorker(FastCRUD[
                     WorkerProfile,
                     WorkerProfileCreate,
                     WorkerProfileUpdate,
                     WorkerProfileUpdateInternal,
                     WorkerProfileDelete,
                     WorkerProfileRead
                 ]):
    async def create(self, db: AsyncSession, object: WorkerProfileCreate, **kwargs) -> WorkerProfile:
        user_id = kwargs.get("user_id")
        if not isinstance(user_id, int):
            raise ValueError("user_id must be a valid integer.")

        user_exists = await crud_users.exists(db=db, id=user_id)
        if not user_exists:
            raise ValueError("User does not exist.")

        existing = await self.exists(db=db, user_id=user_id)
        if existing:
            raise DuplicateValueException("Each user can only have one worker profile.")

        db_obj = WorkerProfile(**object.model_dump(mode="json"), user_id=user_id)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def delete(self, db: AsyncSession, user_id: int, hard: bool = False):
        user = await db.get(User, user_id)
        if not user:
            raise NoResultFound("The user does not exist")

        existing = await self.exists(db=db, user_id=user_id)
        if not existing:
            raise NoResultFound("The worker profile does not exist.")

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

    async def get_multi(
            self,
            db: AsyncSession,
            offset: int = 0,
            limit: int = 100,
            is_verified: bool | None = None,
            is_available: bool | None = None,
            min_years_of_experience: int | None = None,
            max_years_of_experience: int | None = None,
            min_hourly_rate: int | None = None,
            max_hourly_rate: int | None = None,
            min_service_radius_km: int | None = None,
            max_service_radius_km: int | None = None,
    ) -> dict:
        filters = []  # BinaryExpression objects created by SQLAlchemy when comparing columns
        if is_verified is not None:
            filters.append(WorkerProfile.is_verified == is_verified)
        if is_available is not None:
            filters.append(WorkerProfile.is_available == is_available)
        if min_years_of_experience is not None:
            filters.append(WorkerProfile.years_of_experience >= min_years_of_experience)
        if max_years_of_experience is not None:
            filters.append(WorkerProfile.years_of_experience <= max_years_of_experience)
        if min_hourly_rate is not None:
            filters.append(WorkerProfile.hourly_rate >= min_hourly_rate)
        if max_hourly_rate is not None:
            filters.append(WorkerProfile.hourly_rate <= max_hourly_rate)
        if min_service_radius_km is not None:
            filters.append(WorkerProfile.service_radius_km >= min_service_radius_km)
        if max_service_radius_km is not None:
            filters.append(WorkerProfile.service_radius_km <= max_service_radius_km)

        query = select(WorkerProfile)
        if filters:
            query = query.where(and_(*filters))

        query = query.offset(offset).limit(limit)
        result = await db.execute(query)
        data = result.scalars().all()  # scalars() is needed to convert the result into a list of WorkerProfile instances.

        return {"data": data, "total_count": len(data)}


crud_workers = CRUDWorker(WorkerProfile)

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
