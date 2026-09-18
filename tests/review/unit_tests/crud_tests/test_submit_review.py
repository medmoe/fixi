from decimal import Decimal

import pytest
from sqlalchemy import select

from src.app.core.exceptions.http_exceptions import BadRequestException, ForbiddenException
from src.app.crud.crud_reviews import crud_reviews
from src.app.models import ApplicationStatus, Job, JobApplication, JobStatus, Review, UserRole, WorkerProfile
from src.app.schemas.review import ReviewCreateRequest
from tests.conftest import create_test_user


async def accept_worker_for_job(async_session, job: Job, worker_profile: WorkerProfile) -> JobApplication:
    application = JobApplication(job_id=job.id, worker_profile_id=worker_profile.id, status=ApplicationStatus.ACCEPTED)
    async_session.add(application)
    await async_session.commit()
    return application


class TestSubmitReview:
    """Test CRUDReview.submit_review."""

    @pytest.mark.unit
    async def test_customer_review_persists_and_recalculates_worker_rating(
            self, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile
    ):
        await accept_worker_for_job(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.COMPLETED
        await async_session.commit()

        response = await crud_reviews.submit_review(
            async_session, job=test_job, user_id=customer_test_user.id,
            payload=ReviewCreateRequest(rating=5, comment="Great work"),
        )

        assert response.rating == 5
        assert response.comment == "Great work"
        assert response.role == UserRole.CUSTOMER

        review = await async_session.scalar(select(Review).where(Review.id == response.id))
        assert review.job_id == test_job.id
        assert review.reviewer_id == customer_test_user.id
        assert review.reviewee_id == test_worker_profile.user_id

        refreshed_profile = await async_session.scalar(
            select(WorkerProfile).where(WorkerProfile.id == test_worker_profile.id)
        )
        assert refreshed_profile.average_rating == Decimal("5.00")
        assert refreshed_profile.review_count == 1

    @pytest.mark.unit
    async def test_worker_review_persists_without_touching_worker_profile(
            self, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile
    ):
        await accept_worker_for_job(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.COMPLETED
        await async_session.commit()

        response = await crud_reviews.submit_review(
            async_session, job=test_job, user_id=test_worker_profile.user_id,
            payload=ReviewCreateRequest(rating=4),
        )

        assert response.role == UserRole.WORKER
        review = await async_session.scalar(select(Review).where(Review.id == response.id))
        assert review.reviewer_id == test_worker_profile.user_id
        assert review.reviewee_id == customer_test_user.id

        # the worker's own rating snapshot is untouched -- this review is about the customer
        refreshed_profile = await async_session.scalar(
            select(WorkerProfile).where(WorkerProfile.id == test_worker_profile.id)
        )
        assert refreshed_profile.average_rating is None
        assert refreshed_profile.review_count == 0

    @pytest.mark.unit
    async def test_not_a_participant_raises_forbidden(self, async_session, test_job: Job):
        other = await create_test_user(async_session, role_type=UserRole.CUSTOMER)
        test_job.status = JobStatus.COMPLETED
        await async_session.commit()

        with pytest.raises(ForbiddenException):
            await crud_reviews.submit_review(
                async_session, job=test_job, user_id=other.id, payload=ReviewCreateRequest(rating=5)
            )

    @pytest.mark.unit
    async def test_job_not_complete_raises_bad_request(self, async_session, test_job: Job, customer_test_user):
        assert test_job.status == JobStatus.OPEN

        with pytest.raises(BadRequestException):
            await crud_reviews.submit_review(
                async_session, job=test_job, user_id=customer_test_user.id, payload=ReviewCreateRequest(rating=5)
            )

    @pytest.mark.unit
    async def test_already_submitted_raises_bad_request(
            self, async_session, test_job: Job, customer_test_user, test_worker_profile: WorkerProfile
    ):
        await accept_worker_for_job(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.COMPLETED
        await async_session.commit()

        await crud_reviews.submit_review(
            async_session, job=test_job, user_id=customer_test_user.id, payload=ReviewCreateRequest(rating=5)
        )

        with pytest.raises(BadRequestException):
            await crud_reviews.submit_review(
                async_session, job=test_job, user_id=customer_test_user.id, payload=ReviewCreateRequest(rating=3)
            )
