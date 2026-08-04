from datetime import datetime, UTC

from fastcrud import FastCRUD
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions.http_exceptions import BadRequestException, NotFoundException, ForbiddenException
from ..models import Job, JobStatus
from ..schemas.job import JobCreate, JobUpdate, JobRead, JobCreateInternal, JobUpdateInternal, JobDelete, JobFilter


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

        data = object.model_dump(mode="json", exclude_unset=True)
        internal = JobCreateInternal(**data, user_id=user_id)
        return await super().create(
            db=db,
            object=internal,
            schema_to_select=JobRead,
            return_as_model=True
        )

    async def update_job(self, db: AsyncSession, object: JobUpdate, user_id: int, job_id: int) -> JobRead:
        # verify job exists and belongs to user
        job = await db.get(Job, job_id)
        if job is None:
            raise NotFoundException(f"Job with id {job_id} not found")

        if job.user_id != user_id:
            raise ForbiddenException(f"You do not have permission to update this job")

        if job.is_deleted:
            raise NotFoundException(f"Job with id {job_id} has been deleted")

        # Only open jobs can be edited
        if job.status != JobStatus.OPEN:
            raise BadRequestException(f"Only OPEN jobs can be edited. Current status: {job.status}")

        data = object.model_dump(mode="json", exclude_unset=True)
        internal = JobUpdateInternal(**data, updated_at=datetime.now(UTC).replace(tzinfo=None))
        await super().update(db=db, object=internal, id=job_id)
        updated_job = await db.get(Job, job_id)
        return JobRead.model_validate(updated_job)

    async def delete_job(self, db: AsyncSession, user_id: int, job_id: int):
        """ Soft delete job"""
        job = await db.get(Job, job_id)
        if job is None or job.is_deleted:
            raise NotFoundException(f"Job with id {job_id} not found")

        if job.user_id != user_id:
            raise ForbiddenException(f"You do not have permission to delete this job")

        job.is_deleted = True
        job.deleted_at = datetime.now(UTC).replace(tzinfo=None)
        job.updated_at = datetime.now(UTC).replace(tzinfo=None)
        await db.commit()

    async def get_multi_jobs(self, db: AsyncSession, filters: JobFilter, offset: int = 0, limit: int = 20) -> list[JobRead]:
        # build filter kwargs for FastCRUD
        filter_kwargs: dict = {"is_deleted": False}  # never show deleted, by default
        if filters.status is not None:
            filter_kwargs["status"] = filters.status.value
        if filters.trade_category_id is not None:
            filter_kwargs["trade_category_id"] = filters.trade_category_id
        if filters.user_id is not None:
            filter_kwargs["user_id"] = filters.user_id

        # range filters using fastCRUD __ syntax
        if filters.min_budget is not None:
            filter_kwargs["max_budget__gte"] = filters.min_budget
        if filters.max_budget is not None:
            filter_kwargs["min_budget__lte"] = filters.max_budget

        # search — requires raw SQL for ILIKE
        if filters.search:
            stmt = (
                select(Job)
                .where(
                    or_(
                        Job.title.ilike(f"%{filters.search}%"),
                        Job.description.ilike(f"%{filters.search}%"),
                    )
                )
                .where(Job.is_deleted == False)
                .offset(offset)
                .limit(limit)
            )
            result = await db.execute(stmt)
            jobs = result.scalars().all()
            return [JobRead.model_validate(job) for job in jobs]

        jobs = await super().get_multi(
            db=db,
            offset=offset,
            limit=limit,
            schema_to_select=JobRead,
            return_as_model=True,
            **filter_kwargs
        )
        return [JobRead.model_validate(job) for job in jobs]
