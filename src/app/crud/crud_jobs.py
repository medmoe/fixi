from datetime import UTC, datetime
from typing import Any

from fastcrud import FastCRUD
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..core.exceptions.http_exceptions import BadRequestException, ForbiddenException, NotFoundException
from ..crud.crud_trade_categories import crud_trade_category
from ..models import Job, JobStatus
from ..schemas.job import JobCreate, JobCreateInternal, JobDelete, JobFilter, JobRead, JobUpdate, JobUpdateInternal
from ..schemas.utils import build_wkt_point


class CRUDJob(
    FastCRUD[
        Job,
        JobCreateInternal,
        JobUpdate,
        JobUpdateInternal,
        JobDelete,
        JobRead,
    ]
):
    async def _validate_trade_category(self, db: AsyncSession, trade_category_id: int | None):
        if trade_category_id is None:
            return
        exists = await crud_trade_category.exists(db=db, id=trade_category_id)
        if not exists:
            raise NotFoundException("Trade category does not exist")

    async def create_job(self, db: AsyncSession, object: JobCreate, user_id: int) -> JobRead:
        # max 10 active jobs per customer
        active_count = await self.count(
            db=db,
            user_id=user_id,
            is_deleted=False,
            status__in=[JobStatus.OPEN.value, JobStatus.IN_PROGRESS.value, JobStatus.ASSIGNED.value]
        )
        if active_count >= 10:
            raise BadRequestException("Maximum number of active jobs reached")

        await self._validate_trade_category(db=db, trade_category_id=object.trade_category_id)

        data = object.model_dump(mode="json", exclude_unset=True)
        latitude = data.pop('latitude', None)
        longitude = data.pop('longitude', None)

        internal = JobCreateInternal(**data, user_id=user_id, location=build_wkt_point(latitude, longitude))
        return await super().create(
            db=db,
            object=internal,
            schema_to_select=JobRead,
            return_as_model=True
        )

    async def update_job(
            self,
            db: AsyncSession,
            object: JobUpdate,
            user_id: int,
            job_id: int
    ) -> Any:
        # verify job exists and belongs to user
        job = await db.get(Job, job_id)
        if job is None:
            raise NotFoundException(f"Job with id {job_id} not found")

        if job.user_id != user_id:
            raise ForbiddenException("You do not have permission to update this job")

        if job.is_deleted:
            raise NotFoundException(f"Job with id {job_id} has been deleted")

        # Only open jobs can be edited
        if job.status != JobStatus.OPEN:
            raise BadRequestException(f"Only OPEN jobs can be edited. Current status: {job.status}")

        await self._validate_trade_category(db=db, trade_category_id=object.trade_category_id)

        data = object.model_dump(mode="json", exclude_unset=True)
        latitude = data.pop('latitude', None)
        longitude = data.pop('longitude', None)
        internal = JobUpdateInternal(
            **data,
            updated_at=datetime.now(UTC).replace(tzinfo=None),
            user_id=user_id,
            location=build_wkt_point(latitude, longitude)
        )
        return await super().update(db=db, object=internal, id=job_id, schema_to_select=JobRead, return_as_model=True)

    async def delete_job(self, db: AsyncSession, user_id: int, job_id: int):
        """ Soft delete job"""
        job = await db.get(Job, job_id)
        if job is None or job.is_deleted:
            raise NotFoundException(f"Job with id {job_id} not found")

        if job.user_id != user_id:
            raise ForbiddenException("You do not have permission to delete this job")

        job.is_deleted = True
        job.deleted_at = datetime.now(UTC).replace(tzinfo=None)
        job.updated_at = datetime.now(UTC).replace(tzinfo=None)
        await db.commit()

    def _apply_filters(self, stmt, filters: JobFilter):
        """Applies WHERE clauses only — no SELECT, no joinedload, no offset/limit."""
        stmt = stmt.where(Job.is_deleted == False)  # noqa: E712
        if filters.status is not None:
            stmt = stmt.where(Job.status == filters.status)
        if filters.trade_category_id is not None:
            stmt = stmt.where(Job.trade_category_id == filters.trade_category_id)
        if filters.user_id is not None:
            stmt = stmt.where(Job.user_id == filters.user_id)
        if filters.budget_min is not None:
            stmt = stmt.where(Job.budget_max >= filters.budget_min)
        if filters.budget_max is not None:
            stmt = stmt.where(Job.budget_min <= filters.budget_max)
        if filters.search:
            stmt = stmt.where(
                or_(
                    Job.title.ilike(f"%{filters.search}%"),
                    Job.description.ilike(f"%{filters.search}%"),
                )
            )
        return stmt

    async def get_multi_jobs(self, db: AsyncSession, filters: JobFilter, offset: int = 0, limit: int = 50) -> list[JobRead]:
        stmt = self._apply_filters(
            select(Job).options(
                joinedload(Job.trade_category),
                joinedload(Job.user)
            ),
            filters
        )
        stmt = stmt.offset(offset).limit(limit)
        result = await db.execute(stmt)
        return [JobRead.model_validate(j) for j in result.scalars().unique().all()]

    async def count_jobs(self, db: AsyncSession, filters: JobFilter) -> Any:
        stmt = self._apply_filters(select(func.count(Job.id)), filters)
        result = await db.execute(stmt)
        return result.scalar_one()


crud_jobs = CRUDJob(Job)
