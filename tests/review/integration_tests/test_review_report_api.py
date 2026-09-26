from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import Job, Review, User, WorkerProfile


async def leave_review(async_session: AsyncSession, job: Job, reviewer: User, worker_profile: WorkerProfile) -> Review:
    review = Review(job_id=job.id, reviewer_id=reviewer.id, reviewee_id=worker_profile.user_id, rating=5)
    async_session.add(review)
    await async_session.commit()
    await async_session.refresh(review)
    return review


class TestReportReview:
    """POST /api/v1/reviews/{review_id}/report"""

    async def test_authenticated_user_can_report(
            self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers,
            test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile,
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile)

        response = await async_client.post(
            f"/api/v1/reviews/{review.id}/report", json={"reason": "Spam"}, headers=customer_auth_headers,
        )

        assert response.status_code == 204

    async def test_reason_is_optional(
            self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers,
            test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile,
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile)

        response = await async_client.post(f"/api/v1/reviews/{review.id}/report", json={}, headers=customer_auth_headers)

        assert response.status_code == 204

    async def test_duplicate_report_returns_400(
            self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers,
            test_job: Job, customer_test_user: User, test_worker_profile: WorkerProfile,
    ):
        review = await leave_review(async_session, test_job, customer_test_user, test_worker_profile)
        await async_client.post(f"/api/v1/reviews/{review.id}/report", json={}, headers=customer_auth_headers)

        response = await async_client.post(f"/api/v1/reviews/{review.id}/report", json={}, headers=customer_auth_headers)

        assert response.status_code == 400

    async def test_404_for_a_missing_review(self, async_client: AsyncClient, customer_auth_headers):
        response = await async_client.post("/api/v1/reviews/999999/report", json={}, headers=customer_auth_headers)
        assert response.status_code == 404

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient):
        response = await async_client.post("/api/v1/reviews/1/report", json={})
        assert response.status_code == 401
