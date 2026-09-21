from unittest.mock import AsyncMock, patch

import pytest

from src.app.crud.crud_reviews import crud_reviews
from src.app.models import ApplicationStatus, Job, JobApplication, JobStatus, WorkerProfile
from src.app.schemas.review import ReviewCreateRequest


async def accept_worker_for_job(async_session, job: Job, worker_profile: WorkerProfile) -> JobApplication:
    application = JobApplication(job_id=job.id, worker_profile_id=worker_profile.id, status=ApplicationStatus.ACCEPTED)
    async_session.add(application)
    await async_session.commit()
    return application


@pytest.mark.unit
class TestSubmitReviewNotifications:
    @patch("src.app.crud.crud_reviews.notify_user", new_callable=AsyncMock)
    async def test_customer_reviewing_a_worker_notifies_the_worker(
            self, mock_notify, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile
    ):
        await accept_worker_for_job(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.COMPLETED
        await async_session.commit()

        await crud_reviews.submit_review(
            async_session, job=test_job, user_id=customer_test_user.id,
            payload=ReviewCreateRequest(rating=5, comment="Great work"),
        )

        mock_notify.assert_awaited_once()
        kwargs = mock_notify.await_args.kwargs
        assert kwargs["event_type"] == "review_received"
        assert kwargs["user_id"] == test_worker_profile.user_id
        assert kwargs["related_job_id"] == test_job.id
        assert kwargs["email_payload"]["reviewer_name"] == customer_test_user.name
        assert kwargs["email_payload"]["rating"] == "5"
        assert kwargs["email_payload"]["comment"] == "Great work"
        assert kwargs["email_payload"]["job_title"] == test_job.title

    @patch("src.app.crud.crud_reviews.notify_user", new_callable=AsyncMock)
    async def test_worker_reviewing_a_customer_notifies_the_customer(
            self, mock_notify, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile
    ):
        await accept_worker_for_job(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.COMPLETED
        await async_session.commit()

        await crud_reviews.submit_review(
            async_session, job=test_job, user_id=test_worker_profile.user_id,
            payload=ReviewCreateRequest(rating=4),
        )

        mock_notify.assert_awaited_once()
        kwargs = mock_notify.await_args.kwargs
        assert kwargs["event_type"] == "review_received"
        assert kwargs["user_id"] == customer_test_user.id
        assert kwargs["email_payload"]["rating"] == "4"
        # comment omitted on this review -- must not blow up rendering
        assert kwargs["email_payload"]["comment"] == ""
