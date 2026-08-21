from fastcrud import FastCRUD
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..core.exceptions.http_exceptions import NotFoundException, ForbiddenException
from ..crud.crud_jobs import crud_jobs
from ..models import JobApplication, WorkerProfile
from ..schemas.job_application import JobApplicationCreate, JobApplicationRead, JobApplicationUpdate, JobApplicationDelete, JobApplicationUpdateInternal


class CRUDJobApplication(FastCRUD[
    JobApplication,
    JobApplicationCreate,
    JobApplicationUpdate,
    JobApplicationUpdateInternal,
    JobApplicationDelete,
    JobApplicationRead
]):
    async def create_job_application(self, db: AsyncSession, object: JobApplicationCreate, user_id: int, job_id: int) -> JobApplicationRead:
        """  Create a job application for users with a worker role only  """
        if not await crud_jobs.exists(db=db, id=job_id):
            raise NotFoundException(f"Job with id {job_id} not found")

        worker_profile = await db.scalar(select(WorkerProfile).where(WorkerProfile.user_id == user_id))
        if not worker_profile:
            raise NotFoundException(f"Worker profile not found for user with id {user_id}")

        data = object.model_dump(mode='json', exclude_unset=True)
        internal = JobApplicationUpdateInternal(**data, job_id=job_id, worker_profile_id=worker_profile.id)
        return await super().create(db=db, object=internal, schema_to_select=JobApplicationRead, return_as_model=True)

    async def get_job_applications(self, db: AsyncSession, job_id: int, user_id: int, offset: int = 0, limit: int = 50) -> list[JobApplicationRead]:
        """ Get job applications — job owner only"""
        stmt = select(JobApplication).options(
            joinedload(JobApplication.job),
            joinedload(JobApplication.worker_profile).options(joinedload(WorkerProfile.user))
        ).where(
            and_(
                JobApplication.job_id == job_id,
                JobApplication.job.user_id == user_id
            )
        ).offset(offset).limit(limit)

        result = await db.execute(stmt)
        return [JobApplicationRead.model_validate(job_application) for job_application in result.scalars().unique().all()]

    async def update_job_application(self, db: AsyncSession, job_id: int, app_id: int, user_id: int, object: JobApplicationUpdate):
        if not await self.exists(db=db, id=app_id):
            raise NotFoundException(f"Job application with id {app_id} not found")

        if not await crud_jobs.exists(db=db, id=job_id):
            raise NotFoundException(f"Job with id {job_id} not found.")

        if not await crud_jobs.exists(db=db, user_id=user_id):
            raise ForbiddenException(f"Only owner of this job can update it.")

        return await super().update(db=db, object=object, schema_to_select=JobApplicationRead, return_as_model=True)


crud_job_application = CRUDJobApplication(JobApplication)
