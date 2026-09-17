from decimal import Decimal

import pytest
from sqlalchemy import select

from src.app.models import Job, Review, TradeCategory, UserRole, WorkerProfile
from src.app.services.rating_service import recalculate_worker_rating
from tests.conftest import create_test_user
from tests.job.helpers import create_test_job


async def leave_review(async_session, worker_profile: WorkerProfile, test_trade_category: TradeCategory, rating: int, is_flagged: bool = False) -> Review:
    """Creates a fresh job + customer so each review lands on its own (job_id, reviewer_id) pair."""
    customer = await create_test_user(async_session, role_type=UserRole.CUSTOMER)
    job: Job = await create_test_job(async_session, customer, test_trade_category=test_trade_category)

    review = Review(
        job_id=job.id,
        reviewer_id=customer.id,
        reviewee_id=worker_profile.user_id,
        role=UserRole.CUSTOMER,
        rating=rating,
        is_flagged=is_flagged,
    )
    async_session.add(review)
    await async_session.commit()
    await async_session.refresh(review)
    return review


class TestRecalculateWorkerRating:
    """Test recalculate_worker_rating service."""

    @pytest.mark.unit
    async def test_computes_average_and_count_from_non_flagged_reviews(
            self, async_session, test_worker_profile: WorkerProfile, test_trade_category: TradeCategory
    ):
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=5)
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=3)
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=4)

        result = await recalculate_worker_rating(async_session, worker_id=test_worker_profile.user_id)

        assert result["average_rating"] == Decimal("4.00")
        assert result["review_count"] == 3

    @pytest.mark.unit
    async def test_excludes_flagged_reviews_from_average(
            self, async_session, test_worker_profile: WorkerProfile, test_trade_category: TradeCategory
    ):
        """A flagged review shouldn't count toward the average or the count --
        the rating should drop once it's excluded."""
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=5)
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=5)
        # a flagged 1-star review would drag the average down if it were included
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=1, is_flagged=True)

        result = await recalculate_worker_rating(async_session, worker_id=test_worker_profile.user_id)

        assert result["average_rating"] == Decimal("5.00")
        assert result["review_count"] == 2

    @pytest.mark.unit
    async def test_returns_none_average_and_zero_count_with_no_reviews(
            self, async_session, test_worker_profile: WorkerProfile
    ):
        result = await recalculate_worker_rating(async_session, worker_id=test_worker_profile.user_id)

        assert result["average_rating"] is None
        assert result["review_count"] == 0

    @pytest.mark.unit
    async def test_recalculates_to_null_when_only_flagged_reviews_remain(
            self, async_session, test_worker_profile: WorkerProfile, test_trade_category: TradeCategory
    ):
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=5, is_flagged=True)
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=2, is_flagged=True)

        result = await recalculate_worker_rating(async_session, worker_id=test_worker_profile.user_id)

        assert result["average_rating"] is None
        assert result["review_count"] == 0

    @pytest.mark.unit
    async def test_persists_result_on_worker_profile(
            self, async_session, test_worker_profile: WorkerProfile, test_trade_category: TradeCategory
    ):
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=4)
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=2)

        await recalculate_worker_rating(async_session, worker_id=test_worker_profile.user_id)
        await async_session.commit()

        refreshed = await async_session.scalar(
            select(WorkerProfile).where(WorkerProfile.id == test_worker_profile.id)
        )
        assert refreshed.average_rating == Decimal("3.00")
        assert refreshed.review_count == 2

    @pytest.mark.unit
    async def test_sees_review_added_earlier_in_the_same_transaction(
            self, async_session, test_worker_profile: WorkerProfile, test_trade_category: TradeCategory
    ):
        """The review insert and the recalculation are meant to run in the same
        transaction -- an uncommitted, unflushed review must still be picked up."""
        customer = await create_test_user(async_session, role_type=UserRole.CUSTOMER)
        job = await create_test_job(async_session, customer, test_trade_category=test_trade_category)
        review = Review(
            job_id=job.id,
            reviewer_id=customer.id,
            reviewee_id=test_worker_profile.user_id,
            role=UserRole.CUSTOMER,
            rating=5,
        )
        async_session.add(review)
        # deliberately no flush/commit here -- recalculate_worker_rating must flush it itself

        result = await recalculate_worker_rating(async_session, worker_id=test_worker_profile.user_id)

        assert result["average_rating"] == Decimal("5.00")
        assert result["review_count"] == 1
