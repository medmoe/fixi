from datetime import UTC, datetime, timedelta

import pytest

from src.app.models import ApplicationDeclineReason, ApplicationStatus, Job, JobApplication, JobStatus, WorkerProfile
from src.app.services.job_timeout_service import expire_unconfirmed_assignments, expire_unconfirmed_completions

PAST_TIMEOUT = timedelta(hours=25)
WITHIN_TIMEOUT = timedelta(hours=1)


async def accept_application(async_session, job: Job, worker_profile: WorkerProfile, accepted_at) -> JobApplication:
    application = JobApplication(
        job_id=job.id, worker_profile_id=worker_profile.id, status=ApplicationStatus.ACCEPTED, accepted_at=accepted_at,
    )
    async_session.add(application)
    await async_session.commit()
    await async_session.refresh(application)
    return application


class TestExpireUnconfirmedAssignments:
    """Test expire_unconfirmed_assignments service."""

    @pytest.mark.unit
    async def test_rejects_and_logs_no_show_past_the_timeout(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        application = await accept_application(async_session, test_job, test_worker_profile, datetime.now(UTC) - PAST_TIMEOUT)

        count = await expire_unconfirmed_assignments(async_session)

        assert count == 1
        await async_session.refresh(application)
        assert application.status == ApplicationStatus.REJECTED
        assert application.decline_reason == ApplicationDeclineReason.UNRESPONSIVE
        await async_session.refresh(test_worker_profile)
        assert test_worker_profile.no_show_count == 1

    @pytest.mark.unit
    async def test_job_stays_open_after_expiry(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        await accept_application(async_session, test_job, test_worker_profile, datetime.now(UTC) - PAST_TIMEOUT)

        await expire_unconfirmed_assignments(async_session)

        await async_session.refresh(test_job)
        assert test_job.status == JobStatus.OPEN

    @pytest.mark.unit
    async def test_does_not_expire_within_the_timeout_window(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        application = await accept_application(async_session, test_job, test_worker_profile, datetime.now(UTC) - WITHIN_TIMEOUT)

        count = await expire_unconfirmed_assignments(async_session)

        assert count == 0
        await async_session.refresh(application)
        assert application.status == ApplicationStatus.ACCEPTED

    @pytest.mark.unit
    async def test_does_not_expire_an_already_confirmed_application(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        application = await accept_application(async_session, test_job, test_worker_profile, datetime.now(UTC) - PAST_TIMEOUT)
        application.worker_confirmed_at = datetime.now(UTC)
        await async_session.commit()

        count = await expire_unconfirmed_assignments(async_session)

        assert count == 0


class TestExpireUnconfirmedCompletions:
    """Test expire_unconfirmed_completions service."""

    @pytest.mark.unit
    async def test_auto_completes_and_logs_worker_no_show_when_worker_silent(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        await accept_application(async_session, test_job, test_worker_profile, datetime.now(UTC))
        test_job.status = JobStatus.IN_PROGRESS
        test_job.customer_marked_complete_at = datetime.now(UTC) - PAST_TIMEOUT
        await async_session.commit()

        count = await expire_unconfirmed_completions(async_session)

        assert count == 1
        await async_session.refresh(test_job)
        assert test_job.status == JobStatus.COMPLETED
        assert test_job.worker_marked_complete_at is not None
        await async_session.refresh(test_worker_profile)
        assert test_worker_profile.no_show_count == 1

    @pytest.mark.unit
    async def test_auto_completes_and_logs_customer_no_show_when_customer_silent(
            self, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile
    ):
        from src.app.models import CustomerProfile

        customer_profile = CustomerProfile(user_id=customer_test_user.id)
        async_session.add(customer_profile)

        await accept_application(async_session, test_job, test_worker_profile, datetime.now(UTC))
        test_job.status = JobStatus.IN_PROGRESS
        test_job.worker_marked_complete_at = datetime.now(UTC) - PAST_TIMEOUT
        await async_session.commit()

        count = await expire_unconfirmed_completions(async_session)

        assert count == 1
        await async_session.refresh(test_job)
        assert test_job.status == JobStatus.COMPLETED
        assert test_job.customer_marked_complete_at is not None
        await async_session.refresh(customer_profile)
        assert customer_profile.no_show_count == 1

    @pytest.mark.unit
    async def test_does_not_expire_within_the_timeout_window(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        await accept_application(async_session, test_job, test_worker_profile, datetime.now(UTC))
        test_job.status = JobStatus.IN_PROGRESS
        test_job.customer_marked_complete_at = datetime.now(UTC) - WITHIN_TIMEOUT
        await async_session.commit()

        count = await expire_unconfirmed_completions(async_session)

        assert count == 0
        await async_session.refresh(test_job)
        assert test_job.status == JobStatus.IN_PROGRESS

    @pytest.mark.unit
    async def test_does_not_touch_jobs_where_neither_side_has_confirmed(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        await accept_application(async_session, test_job, test_worker_profile, datetime.now(UTC))
        test_job.status = JobStatus.IN_PROGRESS
        await async_session.commit()

        count = await expire_unconfirmed_completions(async_session)

        assert count == 0
