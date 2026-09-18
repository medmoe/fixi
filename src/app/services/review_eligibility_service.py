from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import ApplicationStatus, Job, JobApplication, JobStatus, Review, WorkerProfile
from ..schemas.review import ReviewEligibility, ReviewEligibilityReason


async def get_accepted_worker_user_id(db: AsyncSession, job_id: int) -> int | None:
    """The users.id of the worker with an ACCEPTED application for this job, if any."""
    worker_user_id: int | None = await db.scalar(
        select(WorkerProfile.user_id)
        .join(JobApplication, JobApplication.worker_profile_id == WorkerProfile.id)
        .where(JobApplication.job_id == job_id, JobApplication.status == ApplicationStatus.ACCEPTED)
        .limit(1)
    )
    return worker_user_id


async def check_review_eligibility(db: AsyncSession, job: Job, user_id: int) -> ReviewEligibility:
    """
    The three guards a review submission must pass, read-only -- shared by
    the review-status poll endpoint and the submission endpoint itself, so
    both enforce exactly the same rules.

    Checked in order: being a participant at all is the most fundamental
    gate, then the job needs to be complete, and only then does a prior
    submission matter.
    """
    is_customer = job.user_id == user_id
    accepted_worker_user_id = await get_accepted_worker_user_id(db, job.id)

    if not is_customer and accepted_worker_user_id != user_id:
        return ReviewEligibility(can_review=False, reason=ReviewEligibilityReason.not_a_participant)

    if job.status != JobStatus.COMPLETED:
        return ReviewEligibility(can_review=False, reason=ReviewEligibilityReason.job_not_complete)

    already_submitted = await db.scalar(
        select(Review.id).where(Review.job_id == job.id, Review.reviewer_id == user_id).limit(1)
    )
    if already_submitted is not None:
        return ReviewEligibility(can_review=False, reason=ReviewEligibilityReason.already_submitted)

    return ReviewEligibility(can_review=True)
