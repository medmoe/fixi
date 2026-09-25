from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import ApplicationStatus, Job, JobApplication, JobStatus, Review, WorkerProfile
from ..schemas.review import ReviewEligibility, ReviewEligibilityReason, WorkerReviewEligibility


async def get_accepted_worker_user_id(db: AsyncSession, job_id: int) -> int | None:
    """The users.id of the worker with an ACCEPTED application for this job, if any."""
    worker_user_id: int | None = await db.scalar(
        select(WorkerProfile.user_id)
        .join(JobApplication, JobApplication.worker_profile_id == WorkerProfile.id)
        .where(JobApplication.job_id == job_id, JobApplication.status == ApplicationStatus.ACCEPTED)
        .limit(1)
    )
    return worker_user_id


async def get_accepted_worker_profile_id(db: AsyncSession, job_id: int) -> int | None:
    """The worker_profiles.id (not users.id) of the worker with an ACCEPTED
    application for this job, if any -- what worker_billing rows reference."""
    worker_profile_id: int | None = await db.scalar(
        select(JobApplication.worker_profile_id)
        .where(JobApplication.job_id == job_id, JobApplication.status == ApplicationStatus.ACCEPTED)
        .limit(1)
    )
    return worker_profile_id


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


async def check_worker_review_eligibility(db: AsyncSession, worker_profile_id: int, user_id: int) -> WorkerReviewEligibility:
    """
    Powers the 'Leave a review' CTA on a worker's public profile page.
    Unlike check_review_eligibility (scoped to one job the caller already
    knows about), this aggregates across every job the caller has posted
    with this specific worker to find one that's completed, was actually
    accepted for this worker, and hasn't been reviewed by the caller yet --
    the CTA links straight to that job.

    Only customer -> worker review requests make sense here (this is a
    read-only worker profile page); a worker looking at their own listing
    isn't shown a CTA to review themselves.
    """
    already_reviewed_job_ids = select(Review.job_id).where(Review.reviewer_id == user_id)

    job_id: int | None = await db.scalar(
        select(Job.id)
        .join(JobApplication, JobApplication.job_id == Job.id)
        .where(
            Job.user_id == user_id,
            Job.status == JobStatus.COMPLETED,
            JobApplication.worker_profile_id == worker_profile_id,
            JobApplication.status == ApplicationStatus.ACCEPTED,
            Job.id.not_in(already_reviewed_job_ids),
        )
        .order_by(Job.created_at.desc())
        .limit(1)
    )

    return WorkerReviewEligibility(can_review=job_id is not None, job_id=job_id)
