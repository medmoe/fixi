from datetime import UTC, datetime
from typing import cast, Any

from fastcrud import FastCRUD
from fastcrud.types import GetMultiResponseDict, GetMultiResponseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions.http_exceptions import BadRequestException, ForbiddenException, NotFoundException
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

    async def get_multi_jobs(
            self,
            db: AsyncSession,
            filters: JobFilter,
            offset: int = 0,
            limit: int = 20
    ) -> GetMultiResponseModel | GetMultiResponseDict:
        # build filter kwargs for FastCRUD
        filter_kwargs: dict = {"is_deleted": False}  # never show deleted, by default
        if filters.status is not None:
            filter_kwargs["status"] = filters.status.value
        if filters.trade_category_id is not None:
            filter_kwargs["trade_category_id"] = filters.trade_category_id
        if filters.user_id is not None:
            filter_kwargs["user_id"] = filters.user_id

        # range filters using fastCRUD __ syntax
        if filters.budget_min is not None:
            filter_kwargs["budget_max__gte"] = filters.budget_min
        if filters.budget_max is not None:
            filter_kwargs["budget_min__lte"] = filters.budget_max

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
                .where(Job.is_deleted == False)  # noqa: E712
                .offset(offset)
                .limit(limit)
            )
            result = await db.execute(stmt)
            jobs = result.scalars().all()
            response: GetMultiResponseModel = {
                'data': [JobRead.model_validate(job) for job in jobs],
                'total_count': len(jobs)
            }
            return response

        response = await super().get_multi(
            db=db,
            offset=offset,
            limit=limit,
            schema_to_select=JobRead,
            return_as_model=True,
            **filter_kwargs
        )
        return cast(GetMultiResponseModel, response)


crud_jobs = CRUDJob(Job)
