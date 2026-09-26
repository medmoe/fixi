import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.app.models import Job, Review, ReviewReport, TradeCategory, User, WorkerProfile
from tests.job.helpers import create_test_job


async def create_review(async_session, job: Job, reviewer: User, worker_profile: WorkerProfile) -> Review:
    review = Review(job_id=job.id, reviewer_id=reviewer.id, reviewee_id=worker_profile.user_id, rating=5)
    async_session.add(review)
    await async_session.commit()
    await async_session.refresh(review)
    return review


class TestReviewReportModel:
    """Test ReviewReport model."""

    @pytest.mark.unit
    async def test_create_report_with_all_fields(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile, other_customer_test_user: User
    ):
        review = await create_review(async_session, test_job, customer_test_user, test_worker_profile)

        report = ReviewReport(review_id=review.id, reporter_id=other_customer_test_user.id, reason="Spam content")
        async_session.add(report)
        await async_session.commit()
        await async_session.refresh(report)

        assert report.id is not None
        assert report.review_id == review.id
        assert report.reporter_id == other_customer_test_user.id
        assert report.reason == "Spam content"
        assert report.created_at is not None

    @pytest.mark.unit
    async def test_reason_is_optional(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile, other_customer_test_user: User
    ):
        review = await create_review(async_session, test_job, customer_test_user, test_worker_profile)

        report = ReviewReport(review_id=review.id, reporter_id=other_customer_test_user.id)
        async_session.add(report)
        await async_session.commit()
        await async_session.refresh(report)

        assert report.reason is None

    @pytest.mark.unit
    async def test_unique_review_reporter_constraint(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile, other_customer_test_user: User
    ):
        review = await create_review(async_session, test_job, customer_test_user, test_worker_profile)
        async_session.add(ReviewReport(review_id=review.id, reporter_id=other_customer_test_user.id))
        await async_session.commit()

        async_session.add(ReviewReport(review_id=review.id, reporter_id=other_customer_test_user.id))
        with pytest.raises(IntegrityError):
            await async_session.commit()

    @pytest.mark.unit
    async def test_same_reporter_can_report_different_reviews(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile,
            other_customer_test_user: User, test_trade_category: TradeCategory,
    ):
        review1 = await create_review(async_session, test_job, customer_test_user, test_worker_profile)
        async_session.add(ReviewReport(review_id=review1.id, reporter_id=other_customer_test_user.id))
        await async_session.commit()

        job2 = await create_test_job(async_session, customer_test_user, test_trade_category=test_trade_category)
        review2 = await create_review(async_session, job2, customer_test_user, test_worker_profile)
        async_session.add(ReviewReport(review_id=review2.id, reporter_id=other_customer_test_user.id))
        await async_session.commit()  # should not raise

    @pytest.mark.unit
    async def test_cascade_delete_on_review_deletion(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile, other_customer_test_user: User
    ):
        review = await create_review(async_session, test_job, customer_test_user, test_worker_profile)
        report = ReviewReport(review_id=review.id, reporter_id=other_customer_test_user.id)
        async_session.add(report)
        await async_session.commit()
        report_id = report.id

        await async_session.delete(review)
        await async_session.commit()

        result = await async_session.execute(select(ReviewReport).where(ReviewReport.id == report_id))
        assert result.scalar_one_or_none() is None

    @pytest.mark.unit
    async def test_cascade_delete_on_reporter_deletion(
            self, async_session, test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile, other_customer_test_user: User
    ):
        review = await create_review(async_session, test_job, customer_test_user, test_worker_profile)
        report = ReviewReport(review_id=review.id, reporter_id=other_customer_test_user.id)
        async_session.add(report)
        await async_session.commit()
        report_id = report.id

        await async_session.delete(other_customer_test_user)
        await async_session.commit()

        result = await async_session.execute(select(ReviewReport).where(ReviewReport.id == report_id))
        assert result.scalar_one_or_none() is None
