import pytest

from src.app.models import ApplicationStatus, Job, JobApplication, JobStatus, Review, UserRole, WorkerProfile
from src.app.services.review_eligibility_service import check_worker_review_eligibility
from tests.job.helpers import create_test_job


async def accept_worker_for_job(async_session, job: Job, worker_profile: WorkerProfile) -> JobApplication:
    application = JobApplication(job_id=job.id, worker_profile_id=worker_profile.id, status=ApplicationStatus.ACCEPTED)
    async_session.add(application)
    await async_session.commit()
    return application


class TestCheckWorkerReviewEligibility:
    """Test check_worker_review_eligibility service."""

    @pytest.mark.unit
    async def test_can_review_a_completed_unreviewed_job_with_this_worker(
            self, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile
    ):
        await accept_worker_for_job(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.COMPLETED
        await async_session.commit()

        result = await check_worker_review_eligibility(
            async_session, worker_profile_id=test_worker_profile.id, user_id=customer_test_user.id
        )

        assert result.can_review is True
        assert result.job_id == test_job.id

    @pytest.mark.unit
    async def test_cannot_review_when_no_job_exists_with_this_worker(
            self, async_session, customer_test_user, test_worker_profile: WorkerProfile
    ):
        result = await check_worker_review_eligibility(
            async_session, worker_profile_id=test_worker_profile.id, user_id=customer_test_user.id
        )

        assert result.can_review is False
        assert result.job_id is None

    @pytest.mark.unit
    async def test_cannot_review_when_job_not_complete(
            self, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile
    ):
        await accept_worker_for_job(async_session, test_job, test_worker_profile)
        assert test_job.status == JobStatus.OPEN

        result = await check_worker_review_eligibility(
            async_session, worker_profile_id=test_worker_profile.id, user_id=customer_test_user.id
        )

        assert result.can_review is False
        assert result.job_id is None

    @pytest.mark.unit
    async def test_cannot_review_when_worker_only_pending_not_accepted(
            self, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile
    ):
        application = JobApplication(job_id=test_job.id, worker_profile_id=test_worker_profile.id)  # default PENDING
        async_session.add(application)
        test_job.status = JobStatus.COMPLETED
        await async_session.commit()

        result = await check_worker_review_eligibility(
            async_session, worker_profile_id=test_worker_profile.id, user_id=customer_test_user.id
        )

        assert result.can_review is False
        assert result.job_id is None

    @pytest.mark.unit
    async def test_cannot_review_a_completed_job_already_reviewed(
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

        result = await check_worker_review_eligibility(
            async_session, worker_profile_id=test_worker_profile.id, user_id=customer_test_user.id
        )

        assert result.can_review is False
        assert result.job_id is None

    @pytest.mark.unit
    async def test_ignores_completed_jobs_with_a_different_worker(
            self, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile, test_other_worker_profile: WorkerProfile
    ):
        await accept_worker_for_job(async_session, test_job, test_other_worker_profile)
        test_job.status = JobStatus.COMPLETED
        await async_session.commit()

        result = await check_worker_review_eligibility(
            async_session, worker_profile_id=test_worker_profile.id, user_id=customer_test_user.id
        )

        assert result.can_review is False
        assert result.job_id is None

    @pytest.mark.unit
    async def test_returns_the_most_recently_created_eligible_job(
            self, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile, test_trade_category
    ):
        await accept_worker_for_job(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.COMPLETED
        await async_session.commit()

        newer_job = await create_test_job(async_session, customer_test_user, test_trade_category=test_trade_category, title="A second job")
        await accept_worker_for_job(async_session, newer_job, test_worker_profile)
        newer_job.status = JobStatus.COMPLETED
        await async_session.commit()

        result = await check_worker_review_eligibility(
            async_session, worker_profile_id=test_worker_profile.id, user_id=customer_test_user.id
        )

        assert result.can_review is True
        assert result.job_id == newer_job.id
