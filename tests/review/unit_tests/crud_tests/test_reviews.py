from decimal import Decimal

import pytest

from src.app.crud.crud_reviews import crud_reviews
from src.app.models import Job, Review, TradeCategory, UserRole, WorkerProfile
from src.app.schemas.review import ReviewSortBy
from tests.conftest import create_test_user
from tests.job.helpers import create_test_job


async def leave_review(async_session, worker_profile: WorkerProfile, test_trade_category: TradeCategory, rating: int, is_flagged: bool = False, reviewer_name: str | None = None, comment: str | None = None) -> Review:
    """Creates a fresh job + customer so each review lands on its own (job_id, reviewer_id) pair."""
    customer = await create_test_user(async_session, role_type=UserRole.CUSTOMER, **({"name": reviewer_name} if reviewer_name else {}))
    job: Job = await create_test_job(async_session, customer, test_trade_category=test_trade_category)

    review = Review(
        job_id=job.id,
        reviewer_id=customer.id,
        reviewee_id=worker_profile.user_id,
        role=UserRole.CUSTOMER,
        rating=rating,
        comment=comment,
        is_flagged=is_flagged,
    )
    async_session.add(review)
    await async_session.commit()
    await async_session.refresh(review)
    return review


class TestGetPublicReviewsForWorker:
    """Test CRUDReview.get_public_reviews_for_worker."""

    @pytest.mark.unit
    async def test_flagged_reviews_do_not_appear_in_results(
            self, async_session, test_worker_profile: WorkerProfile, test_trade_category: TradeCategory
    ):
        visible = await leave_review(async_session, test_worker_profile, test_trade_category, rating=5)
        hidden = await leave_review(async_session, test_worker_profile, test_trade_category, rating=1, is_flagged=True)

        result = await crud_reviews.get_public_reviews_for_worker(async_session, test_worker_profile)

        returned_ids = [r.id for r in result.data]
        assert visible.id in returned_ids
        assert hidden.id not in returned_ids
        assert len(result.data) == 1

    @pytest.mark.unit
    async def test_reviewer_display_name_is_first_name_and_last_initial(
            self, async_session, test_worker_profile: WorkerProfile, test_trade_category: TradeCategory
    ):
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=5, reviewer_name="Kristin Garza")

        result = await crud_reviews.get_public_reviews_for_worker(async_session, test_worker_profile)

        assert result.data[0].reviewer_display_name == "Kristin G."

    @pytest.mark.unit
    async def test_response_never_exposes_reviewer_identity(
            self, async_session, test_worker_profile: WorkerProfile, test_trade_category: TradeCategory
    ):
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=5, reviewer_name="Kristin Garza")

        result = await crud_reviews.get_public_reviews_for_worker(async_session, test_worker_profile)

        dumped = result.data[0].model_dump()
        assert "reviewer_id" not in dumped
        assert "user_id" not in dumped
        assert "Garza" not in dumped["reviewer_display_name"]

    @pytest.mark.unit
    async def test_meta_reflects_worker_profile_denormalized_fields(
            self, async_session, test_worker_profile: WorkerProfile, test_trade_category: TradeCategory
    ):
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=5)
        # simulate recalculate_worker_rating already having synced these
        test_worker_profile.average_rating = Decimal("4.50")
        test_worker_profile.review_count = 9
        await async_session.commit()

        result = await crud_reviews.get_public_reviews_for_worker(async_session, test_worker_profile, limit=10)

        assert result.meta.average_rating == Decimal("4.50")
        assert result.meta.review_count == 9
        assert result.meta.total_pages == 1

    @pytest.mark.unit
    async def test_sort_by_highest_rated_orders_descending(
            self, async_session, test_worker_profile: WorkerProfile, test_trade_category: TradeCategory
    ):
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=2)
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=5)
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=3)

        result = await crud_reviews.get_public_reviews_for_worker(
            async_session, test_worker_profile, sort_by=ReviewSortBy.highest_rated
        )

        ratings = [r.rating for r in result.data]
        assert ratings == [5, 3, 2]

    @pytest.mark.unit
    async def test_cursor_pagination_returns_remaining_items_without_overlap(
            self, async_session, test_worker_profile: WorkerProfile, test_trade_category: TradeCategory
    ):
        first = await leave_review(async_session, test_worker_profile, test_trade_category, rating=5)
        second = await leave_review(async_session, test_worker_profile, test_trade_category, rating=4)
        third = await leave_review(async_session, test_worker_profile, test_trade_category, rating=3)

        page1 = await crud_reviews.get_public_reviews_for_worker(async_session, test_worker_profile, limit=2)
        assert [r.id for r in page1.data] == [third.id, second.id]
        assert page1.next_cursor is not None

        page2 = await crud_reviews.get_public_reviews_for_worker(
            async_session, test_worker_profile, limit=2, cursor=page1.next_cursor
        )
        assert [r.id for r in page2.data] == [first.id]
        assert page2.next_cursor is None

    @pytest.mark.unit
    async def test_rating_breakdown_counts_non_flagged_reviews_per_star(
            self, async_session, test_worker_profile: WorkerProfile, test_trade_category: TradeCategory
    ):
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=5)
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=5)
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=3)
        # flagged reviews shouldn't count toward the breakdown either
        await leave_review(async_session, test_worker_profile, test_trade_category, rating=1, is_flagged=True)

        result = await crud_reviews.get_public_reviews_for_worker(async_session, test_worker_profile)

        assert result.meta.rating_breakdown == {5: 2, 4: 0, 3: 1, 2: 0, 1: 0}

    @pytest.mark.unit
    async def test_rating_breakdown_is_all_zero_with_no_reviews(
            self, async_session, test_worker_profile: WorkerProfile
    ):
        result = await crud_reviews.get_public_reviews_for_worker(async_session, test_worker_profile)

        assert result.meta.rating_breakdown == {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
