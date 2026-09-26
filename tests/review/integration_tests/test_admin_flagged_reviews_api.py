from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import Job, Review, ReviewReport, TradeCategory, User, WorkerProfile
from tests.job.helpers import create_test_job


async def leave_review(async_session: AsyncSession, job: Job, reviewer: User, worker_profile: WorkerProfile, **overrides) -> Review:
    defaults = {"job_id": job.id, "reviewer_id": reviewer.id, "reviewee_id": worker_profile.user_id, "rating": 5}
    defaults.update(overrides)
    review = Review(**defaults)
    async_session.add(review)
    await async_session.commit()
    await async_session.refresh(review)
    return review


class TestListFlaggedReviews:
    """GET /api/v1/admin/flagged-reviews"""

    async def test_admin_can_list_flagged_reviews(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers,
            test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile, other_customer_test_user: User,
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile)
        async_session.add(ReviewReport(review_id=review.id, reporter_id=other_customer_test_user.id, reason="Spam"))
        await async_session.commit()

        response = await async_client.get("/api/v1/admin/flagged-reviews", headers=admin_auth_headers)

        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["id"] == review.id
        assert body[0]["report_count"] == 1

    async def test_excludes_unreported_reviews(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers,
            test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile,
    ):
        await leave_review(async_session, test_job, customer_test_user, test_worker_profile)

        response = await async_client.get("/api/v1/admin/flagged-reviews", headers=admin_auth_headers)

        assert response.status_code == 200
        assert response.json() == []

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers):
        response = await async_client.get("/api/v1/admin/flagged-reviews", headers=auth_headers)
        assert response.status_code == 403

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/admin/flagged-reviews")
        assert response.status_code == 401


class TestApproveFlaggedReview:
    """POST /api/v1/admin/flagged-reviews/{review_id}/approve"""

    async def test_admin_can_approve(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers,
            test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile, other_customer_test_user: User,
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile)
        async_session.add(ReviewReport(review_id=review.id, reporter_id=other_customer_test_user.id))
        await async_session.commit()

        response = await async_client.post(f"/api/v1/admin/flagged-reviews/{review.id}/approve", headers=admin_auth_headers)

        assert response.status_code == 204

    async def test_review_leaves_the_queue_after_approval(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers,
            test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile, other_customer_test_user: User,
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile)
        async_session.add(ReviewReport(review_id=review.id, reporter_id=other_customer_test_user.id))
        await async_session.commit()

        await async_client.post(f"/api/v1/admin/flagged-reviews/{review.id}/approve", headers=admin_auth_headers)

        response = await async_client.get("/api/v1/admin/flagged-reviews", headers=admin_auth_headers)
        assert response.json() == []

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers):
        response = await async_client.post("/api/v1/admin/flagged-reviews/1/approve", headers=auth_headers)
        assert response.status_code == 403

    async def test_404_for_a_missing_review(self, async_client: AsyncClient, admin_auth_headers):
        response = await async_client.post("/api/v1/admin/flagged-reviews/999999/approve", headers=admin_auth_headers)
        assert response.status_code == 404


class TestRemoveFlaggedReview:
    """POST /api/v1/admin/flagged-reviews/{review_id}/remove"""

    async def test_admin_can_remove(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers,
            test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile, other_customer_test_user: User,
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile)
        async_session.add(ReviewReport(review_id=review.id, reporter_id=other_customer_test_user.id))
        await async_session.commit()

        response = await async_client.post(f"/api/v1/admin/flagged-reviews/{review.id}/remove", headers=admin_auth_headers)

        assert response.status_code == 204
        await async_session.refresh(review)
        assert review.is_flagged is True

    async def test_recalculates_worker_rating_immediately(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers,
            test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile,
            other_customer_test_user: User, test_trade_category: TradeCategory,
    ):
        await leave_review(async_session, test_job, customer_test_user, test_worker_profile, rating=5)
        job2 = await create_test_job(async_session, customer_test_user, test_trade_category=test_trade_category)
        bad_review = await leave_review(async_session, job2, customer_test_user, test_worker_profile, rating=1)
        async_session.add(ReviewReport(review_id=bad_review.id, reporter_id=other_customer_test_user.id))
        await async_session.commit()

        await async_client.post(f"/api/v1/admin/flagged-reviews/{bad_review.id}/remove", headers=admin_auth_headers)

        await async_session.refresh(test_worker_profile)
        assert test_worker_profile.average_rating == Decimal("5.00")
        assert test_worker_profile.review_count == 1

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers):
        response = await async_client.post("/api/v1/admin/flagged-reviews/1/remove", headers=auth_headers)
        assert response.status_code == 403

    async def test_404_for_a_missing_review(self, async_client: AsyncClient, admin_auth_headers):
        response = await async_client.post("/api/v1/admin/flagged-reviews/999999/remove", headers=admin_auth_headers)
        assert response.status_code == 404

    async def test_already_removed_returns_400(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers,
            test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile,
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile, is_flagged=True)

        response = await async_client.post(f"/api/v1/admin/flagged-reviews/{review.id}/remove", headers=admin_auth_headers)

        assert response.status_code == 400
