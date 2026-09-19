from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..models import ApplicationDeclineReason, ApplicationStatus, CustomerProfile, Job, JobApplication, JobStatus, WorkerProfile
from .review_eligibility_service import get_accepted_worker_user_id


async def _increment_worker_no_show_by_profile_id(db: AsyncSession, worker_profile_id: int) -> None:
    worker_profile = await db.get(WorkerProfile, worker_profile_id)
    if worker_profile is not None:
        worker_profile.no_show_count += 1


async def _increment_worker_no_show_by_user_id(db: AsyncSession, user_id: int) -> None:
    worker_profile = await db.scalar(select(WorkerProfile).where(WorkerProfile.user_id == user_id))
    if worker_profile is not None:
        worker_profile.no_show_count += 1


async def _increment_customer_no_show(db: AsyncSession, user_id: int) -> None:
    customer_profile = await db.scalar(select(CustomerProfile).where(CustomerProfile.user_id == user_id))
    if customer_profile is not None:
        customer_profile.no_show_count += 1


async def expire_unconfirmed_assignments(db: AsyncSession) -> int:
    """
    An application the customer accepted, but the worker never confirmed
    within the timeout window, auto-rejects and counts as a worker no-show.
    The job stays OPEN so the customer can pick someone else -- unlike
    mutual confirmation, this never touches other applications on the job.
    """
    cutoff = datetime.now(UTC) - timedelta(hours=settings.JOB_LIFECYCLE_TIMEOUT_HOURS)

    result = await db.execute(
        select(JobApplication).where(
            JobApplication.status == ApplicationStatus.ACCEPTED,
            JobApplication.worker_confirmed_at.is_(None),
            JobApplication.accepted_at.is_not(None),
            JobApplication.accepted_at <= cutoff,
        )
    )
    applications = result.scalars().all()

    for application in applications:
        application.status = ApplicationStatus.REJECTED
        application.decline_reason = ApplicationDeclineReason.UNRESPONSIVE
        await _increment_worker_no_show_by_profile_id(db, application.worker_profile_id)

    await db.commit()
    return len(applications)


async def expire_unconfirmed_completions(db: AsyncSession) -> int:
    """
    A job where one side marked it complete but the other never responded
    within the timeout window auto-completes on the silent party's behalf --
    protects the confirming party from being stuck forever (per the original
    concern: a customer stalling to dodge payment or a bad review, or a
    worker stalling to avoid one) -- and counts as a no-show for whichever
    side went quiet.
    """
    cutoff = datetime.now(UTC) - timedelta(hours=settings.JOB_LIFECYCLE_TIMEOUT_HOURS)

    result = await db.execute(
        select(Job).where(
            Job.status == JobStatus.IN_PROGRESS,
            or_(
                and_(
                    Job.customer_marked_complete_at.is_not(None),
                    Job.customer_marked_complete_at <= cutoff,
                    Job.worker_marked_complete_at.is_(None),
                ),
                and_(
                    Job.worker_marked_complete_at.is_not(None),
                    Job.worker_marked_complete_at <= cutoff,
                    Job.customer_marked_complete_at.is_(None),
                ),
            ),
        )
    )
    jobs = result.scalars().all()

    for job in jobs:
        now = datetime.now(UTC)
        if job.customer_marked_complete_at is None:
            job.customer_marked_complete_at = now
            await _increment_customer_no_show(db, job.user_id)
        else:
            job.worker_marked_complete_at = now
            accepted_worker_user_id = await get_accepted_worker_user_id(db, job.id)
            if accepted_worker_user_id is not None:
                await _increment_worker_no_show_by_user_id(db, accepted_worker_user_id)
        job.status = JobStatus.COMPLETED

    await db.commit()
    return len(jobs)


async def run_job_timeout_checks(db: AsyncSession) -> dict[str, int]:
    """Entry point for the hourly cron job."""
    expired_assignments = await expire_unconfirmed_assignments(db)
    expired_completions = await expire_unconfirmed_completions(db)
    return {"expired_assignments": expired_assignments, "expired_completions": expired_completions}
