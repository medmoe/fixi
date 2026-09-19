from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..core.exceptions.http_exceptions import BadRequestException, ForbiddenException
from ..models import ApplicationDeclineReason, ApplicationStatus, Job, JobApplication, JobStatus, WorkerProfile
from ..schemas.job import JobRead
from ..schemas.job_application import JobApplicationRead
from .review_eligibility_service import get_accepted_worker_user_id


async def _get_job_with_relations(db: AsyncSession, job_id: int) -> Job:
    stmt = select(Job).options(joinedload(Job.trade_category), joinedload(Job.user)).where(Job.id == job_id)
    result = await db.execute(stmt)
    return result.unique().scalar_one()


async def _get_application_with_relations(db: AsyncSession, application_id: int) -> JobApplication:
    stmt = (
        select(JobApplication)
        .options(
            joinedload(JobApplication.job).joinedload(Job.user),
            joinedload(JobApplication.job).joinedload(Job.trade_category),
            joinedload(JobApplication.worker_profile).joinedload(WorkerProfile.user),
            joinedload(JobApplication.worker_profile).selectinload(WorkerProfile.worker_trades),
        )
        .where(JobApplication.id == application_id)
    )
    result = await db.execute(stmt)
    return result.unique().scalar_one()


async def _reject_other_applications(db: AsyncSession, job_id: int, winning_application_id: int) -> None:
    """Called the moment an application reaches mutual confirmation --
    every other application on the job (pending or accepted) loses out."""
    result = await db.execute(
        select(JobApplication).where(
            JobApplication.job_id == job_id,
            JobApplication.id != winning_application_id,
            JobApplication.status != ApplicationStatus.REJECTED,
        )
    )
    for other in result.scalars().all():
        other.status = ApplicationStatus.REJECTED
        other.decline_reason = ApplicationDeclineReason.ANOTHER_APPLICANT_SELECTED


async def confirm_application(db: AsyncSession, job: Job, application: JobApplication, user_id: int) -> JobApplicationRead:
    """
    The worker's half of the mutual assignment handshake -- the customer's
    half is already implied by status=ACCEPTED. Once both are in, the job
    moves to ASSIGNED and every other application on it is auto-rejected.
    """
    worker_profile = await db.get(WorkerProfile, application.worker_profile_id)
    if worker_profile is None or worker_profile.user_id != user_id:
        raise ForbiddenException("Only the applicant can confirm this application")

    if application.status != ApplicationStatus.ACCEPTED:
        raise BadRequestException("Only an accepted application can be confirmed")
    if job.status != JobStatus.OPEN:
        raise BadRequestException(f"Cannot confirm — job is no longer open. Current status: {job.status.value}")

    application.worker_confirmed_at = datetime.now(UTC)
    job.status = JobStatus.ASSIGNED
    await _reject_other_applications(db, job.id, application.id)

    await db.commit()

    return JobApplicationRead.model_validate(await _get_application_with_relations(db, application.id))


async def withdraw_application(
        db: AsyncSession, job: Job, application: JobApplication, user_id: int, reason: ApplicationDeclineReason
) -> JobApplicationRead:
    """Worker retracts their own application -- while it's still pending, or
    after being accepted but before the job is actually assigned (i.e. before
    both sides confirmed). Backing out of an already-assigned job is a
    separate, bigger concern than a plain withdrawal and isn't handled here."""
    worker_profile = await db.get(WorkerProfile, application.worker_profile_id)
    if worker_profile is None or worker_profile.user_id != user_id:
        raise ForbiddenException("Only the applicant can withdraw this application")

    if application.status == ApplicationStatus.REJECTED:
        raise BadRequestException("This application has already been rejected")
    if job.status != JobStatus.OPEN:
        raise BadRequestException(f"Cannot withdraw — job is no longer open. Current status: {job.status.value}")

    application.status = ApplicationStatus.REJECTED
    application.decline_reason = reason

    await db.commit()

    return JobApplicationRead.model_validate(await _get_application_with_relations(db, application.id))


async def start_job(db: AsyncSession, job: Job, user_id: int) -> JobRead:
    """Worker marks the job as started. Single-sided — lower stakes than the
    assignment/completion handshakes, since it carries no payment or review implication."""
    accepted_worker_user_id = await get_accepted_worker_user_id(db, job.id)
    if accepted_worker_user_id != user_id:
        raise ForbiddenException("Only the assigned worker can start this job")

    if job.status != JobStatus.ASSIGNED:
        raise BadRequestException(f"Cannot start — job must be assigned first. Current status: {job.status.value}")

    job.status = JobStatus.IN_PROGRESS
    await db.commit()

    return JobRead.model_validate(await _get_job_with_relations(db, job.id))


async def mark_job_complete(db: AsyncSession, job: Job, user_id: int) -> JobRead:
    """
    Either participant marks their side of the job as done. Neither can force
    completion alone -- the job only flips to COMPLETED once both timestamps
    are set, which is also the trigger our review eligibility checks for.
    """
    is_customer = job.user_id == user_id
    accepted_worker_user_id = await get_accepted_worker_user_id(db, job.id)
    is_worker = accepted_worker_user_id == user_id

    if not is_customer and not is_worker:
        raise ForbiddenException("You are not a participant in this job")
    if job.status != JobStatus.IN_PROGRESS:
        raise BadRequestException(f"Cannot mark complete — job must be in progress. Current status: {job.status.value}")

    if is_customer:
        if job.customer_marked_complete_at is not None:
            raise BadRequestException("You have already marked this job complete")
        job.customer_marked_complete_at = datetime.now(UTC)
    else:
        if job.worker_marked_complete_at is not None:
            raise BadRequestException("You have already marked this job complete")
        job.worker_marked_complete_at = datetime.now(UTC)

    if job.customer_marked_complete_at is not None and job.worker_marked_complete_at is not None:
        job.status = JobStatus.COMPLETED

    await db.commit()

    return JobRead.model_validate(await _get_job_with_relations(db, job.id))
