from unittest.mock import AsyncMock, patch

import pytest

from src.app.crud.crud_job_applications import crud_job_application
from src.app.models import ApplicationDeclineReason, ApplicationStatus, Job, JobApplication, WorkerProfile
from src.app.schemas.job_application import JobApplicationUpdate
from src.app.services.job_lifecycle_service import confirm_application, mark_job_complete, start_job, withdraw_application
from tests.conftest import create_test_user, create_test_worker_profile


async def accept_application(async_session, job: Job, worker_profile: WorkerProfile) -> JobApplication:
    application = JobApplication(job_id=job.id, worker_profile_id=worker_profile.id, status=ApplicationStatus.ACCEPTED)
    async_session.add(application)
    await async_session.commit()
    await async_session.refresh(application)
    return application


@pytest.mark.unit
class TestConfirmApplicationNotifications:
    @patch("src.app.services.job_lifecycle_service.notify_user", new_callable=AsyncMock)
    async def test_notifies_the_customer_that_a_worker_confirmed(
            self, mock_notify, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        application = await accept_application(async_session, test_job, test_worker_profile)

        await confirm_application(async_session, job=test_job, application=application, user_id=test_worker_profile.user_id)

        calls = {c.kwargs["event_type"]: c.kwargs for c in mock_notify.await_args_list}
        assert calls["job_application.confirmed"]["user_id"] == test_job.user_id
        assert calls["job_application.confirmed"]["related_job_id"] == test_job.id

    @patch("src.app.services.job_lifecycle_service.notify_user", new_callable=AsyncMock)
    async def test_notifies_auto_rejected_applicants(
            self, mock_notify, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        winning = await accept_application(async_session, test_job, test_worker_profile)

        other_user = await create_test_user(async_session)
        other_profile = await create_test_worker_profile(async_session, user=other_user)
        other_application = JobApplication(job_id=test_job.id, worker_profile_id=other_profile.id)
        async_session.add(other_application)
        await async_session.commit()

        await confirm_application(async_session, job=test_job, application=winning, user_id=test_worker_profile.user_id)

        rejected_calls = [c.kwargs for c in mock_notify.await_args_list if c.kwargs["event_type"] == "job_application.rejected"]
        assert len(rejected_calls) == 1
        assert rejected_calls[0]["user_id"] == other_user.id


@pytest.mark.unit
class TestWithdrawApplicationNotifications:
    @patch("src.app.services.job_lifecycle_service.notify_user", new_callable=AsyncMock)
    async def test_notifies_the_customer_that_the_applicant_withdrew(
            self, mock_notify, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        application = await accept_application(async_session, test_job, test_worker_profile)

        await withdraw_application(
            async_session, job=test_job, application=application, user_id=test_worker_profile.user_id,
            reason=ApplicationDeclineReason.SCHEDULE_CONFLICT,
        )

        mock_notify.assert_awaited_once()
        assert mock_notify.await_args.kwargs["event_type"] == "job_application.withdrawn"
        assert mock_notify.await_args.kwargs["user_id"] == test_job.user_id


@pytest.mark.unit
class TestStartJobNotifications:
    @patch("src.app.services.job_lifecycle_service.notify_user", new_callable=AsyncMock)
    async def test_notifies_the_customer_that_work_started(
            self, mock_notify, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        application = await accept_application(async_session, test_job, test_worker_profile)
        await confirm_application(async_session, job=test_job, application=application, user_id=test_worker_profile.user_id)
        mock_notify.reset_mock()

        await start_job(async_session, job=test_job, user_id=test_worker_profile.user_id)

        mock_notify.assert_awaited_once()
        assert mock_notify.await_args.kwargs["event_type"] == "job.started"
        assert mock_notify.await_args.kwargs["user_id"] == test_job.user_id


@pytest.mark.unit
class TestMarkJobCompleteNotifications:
    async def _assign_and_start(self, async_session, job, worker_profile):
        application = await accept_application(async_session, job, worker_profile)
        with patch("src.app.services.job_lifecycle_service.notify_user", new_callable=AsyncMock):
            await confirm_application(async_session, job=job, application=application, user_id=worker_profile.user_id)
            await start_job(async_session, job=job, user_id=worker_profile.user_id)

    @patch("src.app.services.job_lifecycle_service.notify_user", new_callable=AsyncMock)
    async def test_single_sided_mark_notifies_the_other_participant_to_confirm(
            self, mock_notify, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        await self._assign_and_start(async_session, test_job, test_worker_profile)

        await mark_job_complete(async_session, job=test_job, user_id=test_job.user_id)  # customer marks first

        mock_notify.assert_awaited_once()
        assert mock_notify.await_args.kwargs["event_type"] == "job.completion_pending_confirmation"
        assert mock_notify.await_args.kwargs["user_id"] == test_worker_profile.user_id

    @patch("src.app.services.job_lifecycle_service.notify_user", new_callable=AsyncMock)
    async def test_both_sides_marked_notifies_both_participants_the_job_is_complete(
            self, mock_notify, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        await self._assign_and_start(async_session, test_job, test_worker_profile)
        await mark_job_complete(async_session, job=test_job, user_id=test_job.user_id)
        mock_notify.reset_mock()

        await mark_job_complete(async_session, job=test_job, user_id=test_worker_profile.user_id)  # worker marks second

        completed_calls = [c.kwargs for c in mock_notify.await_args_list if c.kwargs["event_type"] == "job.completed"]
        notified_user_ids = {c["user_id"] for c in completed_calls}
        assert notified_user_ids == {test_job.user_id, test_worker_profile.user_id}


@pytest.mark.unit
class TestUpdateJobApplicationNotifications:
    @patch("src.app.crud.crud_job_applications.notify_user", new_callable=AsyncMock)
    async def test_accepting_notifies_the_worker(
            self, mock_notify, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        application = JobApplication(job_id=test_job.id, worker_profile_id=test_worker_profile.id)
        async_session.add(application)
        await async_session.commit()
        await async_session.refresh(application)

        await crud_job_application.update_job_application(
            async_session, job_id=test_job.id, app_id=application.id, user_id=test_job.user_id,
            object=JobApplicationUpdate(status=ApplicationStatus.ACCEPTED),
        )

        mock_notify.assert_awaited_once()
        assert mock_notify.await_args.kwargs["event_type"] == "job_application.accepted"
        assert mock_notify.await_args.kwargs["user_id"] == test_worker_profile.user_id

    @patch("src.app.crud.crud_job_applications.notify_user", new_callable=AsyncMock)
    async def test_rejecting_notifies_the_worker(
            self, mock_notify, async_session, test_job: Job, test_worker_profile: WorkerProfile
    ):
        application = JobApplication(job_id=test_job.id, worker_profile_id=test_worker_profile.id)
        async_session.add(application)
        await async_session.commit()
        await async_session.refresh(application)

        await crud_job_application.update_job_application(
            async_session, job_id=test_job.id, app_id=application.id, user_id=test_job.user_id,
            object=JobApplicationUpdate(status=ApplicationStatus.REJECTED, decline_reason=ApplicationDeclineReason.SCHEDULE_CONFLICT),
        )

        mock_notify.assert_awaited_once()
        assert mock_notify.await_args.kwargs["event_type"] == "job_application.rejected"
        assert mock_notify.await_args.kwargs["user_id"] == test_worker_profile.user_id
