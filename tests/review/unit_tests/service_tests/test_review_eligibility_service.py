import pytest

from src.app.models import ApplicationStatus, Job, JobApplication, JobStatus, Review, UserRole, WorkerProfile
from src.app.schemas.review import ReviewEligibilityReason
from src.app.services.review_eligibility_service import check_review_eligibility
from tests.conftest import create_test_user


async def accept_worker_for_job(async_session, job: Job, worker_profile: WorkerProfile) -> JobApplication:
    application = JobApplication(job_id=job.id, worker_profile_id=worker_profile.id, status=ApplicationStatus.ACCEPTED)
    async_session.add(application)
    await async_session.commit()
    return application


class TestCheckReviewEligibility:
    """Test check_review_eligibility service."""

    @pytest.mark.unit
    async def test_customer_can_review_completed_job_not_yet_reviewed(
            self, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile
    ):
        await accept_worker_for_job(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.COMPLETED
        await async_session.commit()

        result = await check_review_eligibility(async_session, job=test_job, user_id=customer_test_user.id)

        assert result.can_review is True
        assert result.reason is None

    @pytest.mark.unit
    async def test_accepted_worker_can_review_completed_job(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        await accept_worker_for_job(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.COMPLETED
        await async_session.commit()

        result = await check_review_eligibility(async_session, job=test_job, user_id=test_worker_profile.user_id)

        assert result.can_review is True
        assert result.reason is None

    @pytest.mark.unit
    async def test_unrelated_user_is_not_a_participant(self, async_session, test_job: Job):
        other = await create_test_user(async_session, role_type=UserRole.CUSTOMER)
        test_job.status = JobStatus.COMPLETED
        await async_session.commit()

        result = await check_review_eligibility(async_session, job=test_job, user_id=other.id)

        assert result.can_review is False
        assert result.reason == ReviewEligibilityReason.not_a_participant

    @pytest.mark.unit
    async def test_pending_unaccepted_applicant_is_not_a_participant(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        """A worker who merely applied (status=PENDING, never accepted) isn't a participant."""
        application = JobApplication(job_id=test_job.id, worker_profile_id=test_worker_profile.id)
        async_session.add(application)
        test_job.status = JobStatus.COMPLETED
        await async_session.commit()

        result = await check_review_eligibility(async_session, job=test_job, user_id=test_worker_profile.user_id)

        assert result.can_review is False
        assert result.reason == ReviewEligibilityReason.not_a_participant

    @pytest.mark.unit
    async def test_job_not_complete_blocks_a_participant(
            self, async_session, test_job: Job, customer_test_user
    ):
        assert test_job.status == JobStatus.OPEN

        result = await check_review_eligibility(async_session, job=test_job, user_id=customer_test_user.id)

        assert result.can_review is False
        assert result.reason == ReviewEligibilityReason.job_not_complete

    @pytest.mark.unit
    async def test_already_submitted_blocks_a_second_review(
            self, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile
    ):
        await accept_worker_for_job(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.COMPLETED
        async_session.add(Review(
            job_id=test_job.id,
            reviewer_id=customer_test_user.id,
            reviewee_id=test_worker_profile.user_id,
            role=UserRole.CUSTOMER,
            rating=5,
        ))
        await async_session.commit()

        result = await check_review_eligibility(async_session, job=test_job, user_id=customer_test_user.id)

        assert result.can_review is False
        assert result.reason == ReviewEligibilityReason.already_submitted

    @pytest.mark.unit
    async def test_the_other_participant_can_still_review_after_one_side_already_did(
            self, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile
    ):
        """The unique constraint is per (job, reviewer) -- the customer already
        reviewing shouldn't block the worker's own review of the same job."""
        await accept_worker_for_job(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.COMPLETED
        async_session.add(Review(
            job_id=test_job.id,
            reviewer_id=customer_test_user.id,
            reviewee_id=test_worker_profile.user_id,
            role=UserRole.CUSTOMER,
            rating=5,
        ))
        await async_session.commit()

        result = await check_review_eligibility(async_session, job=test_job, user_id=test_worker_profile.user_id)

        assert result.can_review is True
        assert result.reason is None
