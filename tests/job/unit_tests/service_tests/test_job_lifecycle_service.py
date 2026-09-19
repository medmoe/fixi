import pytest

from src.app.core.exceptions.http_exceptions import BadRequestException, ForbiddenException
from src.app.models import ApplicationDeclineReason, ApplicationStatus, Job, JobApplication, JobStatus, WorkerProfile
from src.app.services.job_lifecycle_service import confirm_application, mark_job_complete, start_job, withdraw_application
from tests.conftest import create_test_user, create_test_worker_profile


async def accept_application(async_session, job: Job, worker_profile: WorkerProfile) -> JobApplication:
    application = JobApplication(job_id=job.id, worker_profile_id=worker_profile.id, status=ApplicationStatus.ACCEPTED)
    async_session.add(application)
    await async_session.commit()
    await async_session.refresh(application)
    return application


class TestConfirmApplication:
    """Test confirm_application service."""

    @pytest.mark.unit
    async def test_confirms_and_moves_job_to_assigned(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        application = await accept_application(async_session, test_job, test_worker_profile)

        result = await confirm_application(async_session, job=test_job, application=application, user_id=test_worker_profile.user_id)

        assert result.status == ApplicationStatus.ACCEPTED.value  # JobApplicationRead.status is a plain str (use_enum_values)
        assert result.worker_confirmed_at is not None
        await async_session.refresh(test_job)
        assert test_job.status == JobStatus.ASSIGNED

    @pytest.mark.unit
    async def test_confirm_auto_rejects_other_applications(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        winning = await accept_application(async_session, test_job, test_worker_profile)

        other_user = await create_test_user(async_session)
        other_profile = await create_test_worker_profile(async_session, user=other_user)
        other_application = JobApplication(job_id=test_job.id, worker_profile_id=other_profile.id)
        async_session.add(other_application)
        await async_session.commit()

        await confirm_application(async_session, job=test_job, application=winning, user_id=test_worker_profile.user_id)

        await async_session.refresh(other_application)
        assert other_application.status == ApplicationStatus.REJECTED
        assert other_application.decline_reason == ApplicationDeclineReason.ANOTHER_APPLICANT_SELECTED

    @pytest.mark.unit
    async def test_confirm_forbidden_for_a_different_user(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        application = await accept_application(async_session, test_job, test_worker_profile)
        other_user = await create_test_user(async_session)

        with pytest.raises(ForbiddenException):
            await confirm_application(async_session, job=test_job, application=application, user_id=other_user.id)

    @pytest.mark.unit
    async def test_confirm_requires_accepted_status(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        application = JobApplication(job_id=test_job.id, worker_profile_id=test_worker_profile.id)  # PENDING
        async_session.add(application)
        await async_session.commit()

        with pytest.raises(BadRequestException):
            await confirm_application(async_session, job=test_job, application=application, user_id=test_worker_profile.user_id)

    @pytest.mark.unit
    async def test_confirm_requires_job_still_open(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        application = await accept_application(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.CANCELLED
        await async_session.commit()

        with pytest.raises(BadRequestException):
            await confirm_application(async_session, job=test_job, application=application, user_id=test_worker_profile.user_id)


class TestWithdrawApplication:
    """Test withdraw_application service."""

    @pytest.mark.unit
    async def test_withdraw_sets_rejected_with_reason(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        application = await accept_application(async_session, test_job, test_worker_profile)

        result = await withdraw_application(
            async_session, job=test_job, application=application, user_id=test_worker_profile.user_id,
            reason=ApplicationDeclineReason.SCHEDULE_CONFLICT,
        )

        assert result.status == ApplicationStatus.REJECTED.value
        assert result.decline_reason == ApplicationDeclineReason.SCHEDULE_CONFLICT.value

    @pytest.mark.unit
    async def test_withdraw_forbidden_for_a_different_user(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        application = await accept_application(async_session, test_job, test_worker_profile)
        other_user = await create_test_user(async_session)

        with pytest.raises(ForbiddenException):
            await withdraw_application(
                async_session, job=test_job, application=application, user_id=other_user.id,
                reason=ApplicationDeclineReason.OTHER,
            )

    @pytest.mark.unit
    async def test_withdraw_fails_if_already_rejected(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        application = JobApplication(job_id=test_job.id, worker_profile_id=test_worker_profile.id, status=ApplicationStatus.REJECTED)
        async_session.add(application)
        await async_session.commit()

        with pytest.raises(BadRequestException):
            await withdraw_application(
                async_session, job=test_job, application=application, user_id=test_worker_profile.user_id,
                reason=ApplicationDeclineReason.OTHER,
            )

    @pytest.mark.unit
    async def test_withdraw_fails_once_job_is_assigned(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        application = await accept_application(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.ASSIGNED
        await async_session.commit()

        with pytest.raises(BadRequestException):
            await withdraw_application(
                async_session, job=test_job, application=application, user_id=test_worker_profile.user_id,
                reason=ApplicationDeclineReason.OTHER,
            )


class TestStartJob:
    """Test start_job service."""

    @pytest.mark.unit
    async def test_start_moves_job_to_in_progress(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        await accept_application(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.ASSIGNED
        await async_session.commit()

        result = await start_job(async_session, job=test_job, user_id=test_worker_profile.user_id)

        assert result.status == JobStatus.IN_PROGRESS.value  # JobRead.status is a plain str (use_enum_values)

    @pytest.mark.unit
    async def test_start_forbidden_for_non_assigned_worker(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        await accept_application(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.ASSIGNED
        await async_session.commit()
        other_user = await create_test_user(async_session)

        with pytest.raises(ForbiddenException):
            await start_job(async_session, job=test_job, user_id=other_user.id)

    @pytest.mark.unit
    async def test_start_requires_assigned_status(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        await accept_application(async_session, test_job, test_worker_profile)
        assert test_job.status == JobStatus.OPEN

        with pytest.raises(BadRequestException):
            await start_job(async_session, job=test_job, user_id=test_worker_profile.user_id)


class TestMarkJobComplete:
    """Test mark_job_complete service."""

    @pytest.mark.unit
    async def test_requires_both_sides_before_completing(
            self, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile
    ):
        await accept_application(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.IN_PROGRESS
        await async_session.commit()

        customer_result = await mark_job_complete(async_session, job=test_job, user_id=customer_test_user.id)
        assert customer_result.status == JobStatus.IN_PROGRESS.value

        await async_session.refresh(test_job)
        worker_result = await mark_job_complete(async_session, job=test_job, user_id=test_worker_profile.user_id)
        assert worker_result.status == JobStatus.COMPLETED.value

    @pytest.mark.unit
    async def test_forbidden_for_non_participant(
            self, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        await accept_application(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.IN_PROGRESS
        await async_session.commit()
        other_user = await create_test_user(async_session)

        with pytest.raises(ForbiddenException):
            await mark_job_complete(async_session, job=test_job, user_id=other_user.id)

    @pytest.mark.unit
    async def test_requires_in_progress_status(
            self, async_session, test_job: Job, customer_test_user
    ):
        assert test_job.status == JobStatus.OPEN

        with pytest.raises(BadRequestException):
            await mark_job_complete(async_session, job=test_job, user_id=customer_test_user.id)

    @pytest.mark.unit
    async def test_same_party_cannot_mark_complete_twice(
            self, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile
    ):
        await accept_application(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.IN_PROGRESS
        await async_session.commit()

        await mark_job_complete(async_session, job=test_job, user_id=customer_test_user.id)
        await async_session.refresh(test_job)

        with pytest.raises(BadRequestException):
            await mark_job_complete(async_session, job=test_job, user_id=customer_test_user.id)
