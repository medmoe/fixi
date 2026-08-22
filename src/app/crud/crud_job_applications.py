from fastcrud import FastCRUD
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..core.exceptions.http_exceptions import NotFoundException, ForbiddenException, BadRequestException
from ..models import JobApplication, WorkerProfile, Job, JobStatus
from ..schemas.job_application import (
    JobApplicationCreate,
    JobApplicationRead,
    JobApplicationUpdate,
    JobApplicationDelete,
    JobApplicationUpdateInternal,
    JobApplicationCreateInternal,
)


class CRUDJobApplication(FastCRUD[
    JobApplication,
    JobApplicationCreateInternal,
    JobApplicationUpdate,
    JobApplicationUpdateInternal,
    JobApplicationDelete,
    JobApplicationRead,
]):
    async def create_job_application(
            self, db: AsyncSession, object: JobApplicationCreate, user_id: int, job_id: int
    ) -> JobApplicationRead:
        """Create a job application — worker role only, job must be OPEN,
        one application per (job, worker) pair enforced by a DB constraint."""
        job = await db.get(Job, job_id)
        if job is None:
            raise NotFoundException(f"Job with id {job_id} not found")
        if job.status != JobStatus.OPEN:
            raise BadRequestException(f"Cannot apply to a job that is not OPEN. Current status: {job.status}")

        worker_profile = await db.scalar(select(WorkerProfile).where(WorkerProfile.user_id == user_id))
        if not worker_profile:
            raise NotFoundException(f"Worker profile not found for user with id {user_id}")

        if await self.exists(db=db, job_id=job_id, worker_profile_id=worker_profile.id):
            raise BadRequestException("You have already applied to this job")

        data = object.model_dump(mode="json", exclude_unset=True)
        internal = JobApplicationCreateInternal(**data, job_id=job_id, worker_profile_id=worker_profile.id)
        new_application = JobApplication(**internal.model_dump())
        db.add(new_application)
        await db.flush()
        await db.refresh(new_application)

        # re-fetch with eager-loaded relationships so JobApplicationRead can
        # validate `job` and `worker_profile` without a lazy-load error
        return await self._get_with_relations(db=db, application_id=new_application.id)

    async def get_job_applications(
            self, db: AsyncSession, db_job_id: int, user_id: int, offset: int = 0, limit: int = 50
    ) -> tuple[list[JobApplicationRead], int]:
        """Get all applications for a job — job owner only. Returns
        (applications, total_count) so the router can build correct
        pagination metadata."""
        job = await db.get(Job, db_job_id)
        if job is None:
            raise NotFoundException(f"Job with id {db_job_id} not found")
        if job.user_id != user_id:
            raise ForbiddenException("Only the owner of this job can view its applications")

        base_stmt = (
            select(JobApplication)
            .join(Job, JobApplication.job_id == Job.id)
            .where(and_(JobApplication.job_id == db_job_id, Job.user_id == user_id))
        )

        count_stmt = select(func.count(JobApplication.id.distinct())).select_from(base_stmt.subquery())
        total_count = (await db.execute(count_stmt)).scalar() or 0

        stmt = (
            base_stmt.options(
                joinedload(JobApplication.job),
                joinedload(JobApplication.worker_profile).joinedload(WorkerProfile.user),
                joinedload(JobApplication.worker_profile).selectinload(WorkerProfile.worker_trades),
            )
            .order_by(JobApplication.id.asc())
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(stmt)
        applications = result.scalars().unique().all()

        return [JobApplicationRead.model_validate(app) for app in applications], total_count

    async def update_job_application(
            self, db: AsyncSession, job_id: int, app_id: int, user_id: int, object: JobApplicationUpdate
    ) -> JobApplicationRead:
        """Update an application's status — only the owner of the job the
        application belongs to may do this, and app_id must actually belong
        to job_id (not just any application the caller can guess an id for)."""
        job = await db.get(Job, job_id)
        if job is None:
            raise NotFoundException(f"Job with id {job_id} not found")
        if job.user_id != user_id:
            raise ForbiddenException("Only the owner of this job can update its applications")

        application = await db.get(JobApplication, app_id)
        if application is None:
            raise NotFoundException(f"Job application with id {app_id} not found")
        if application.job_id != job_id:
            raise NotFoundException(f"Job application with id {app_id} does not belong to job {job_id}")

        internal = JobApplicationUpdateInternal(status=object.status)
        await super().update(db=db, object=internal, id=app_id)

        return await self._get_with_relations(db=db, application_id=app_id)

    async def _get_with_relations(self, db: AsyncSession, application_id: int) -> JobApplicationRead:
        stmt = (
            select(JobApplication)
            .options(
                joinedload(JobApplication.job).joinedload(Job.user),  # ← add .joinedload(Job.user)
                joinedload(JobApplication.job).joinedload(Job.trade_category),  # ← if JobRead also needs this
                joinedload(JobApplication.worker_profile).joinedload(WorkerProfile.user),
                joinedload(JobApplication.worker_profile).selectinload(WorkerProfile.worker_trades),
            )
            .where(JobApplication.id == application_id)
        )
        result = await db.execute(stmt)
        application = result.unique().scalar_one()
        return JobApplicationRead.model_validate(application)

crud_job_application = CRUDJobApplication(JobApplication)
