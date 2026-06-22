import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.security import get_password_hash
from src.app.models.job import Job, JobStatus
from src.app.models.user import User, UserRole
from src.app.models.worker import Worker


@pytest.mark.integration
class TestReviewRatingSystem:
    async def _login_headers(self, async_client: AsyncClient, username: str) -> dict[str, str]:
        login_response = await async_client.post(
            "/api/v1/login",
            data={"username": username, "password": "testpassword123"},
        )
        return {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    @pytest.mark.asyncio
    async def test_review_updates_worker_aggregates(self, async_client: AsyncClient, async_session: AsyncSession):
        customer = User(
            name="Review Customer",
            username="reviewcustomer",
            email="review.customer@example.com",
            hashed_password=get_password_hash("testpassword123"),
            role_type=UserRole.customer,
        )
        worker_user = User(
            name="Review Worker",
            username="reviewworker",
            email="review.worker@example.com",
            hashed_password=get_password_hash("testpassword123"),
            role_type=UserRole.worker,
        )
        async_session.add(customer)
        async_session.add(worker_user)
        await async_session.commit()
        await async_session.refresh(customer)
        await async_session.refresh(worker_user)

        worker_profile = Worker(user_id=worker_user.id, profession="Plumber", hourly_rate=50.0)
        async_session.add(worker_profile)
        await async_session.commit()

        job = Job(
            customer_id=customer.id,
            worker_id=worker_user.id,
            title="Leak fix",
            description="Kitchen leak",
            status=JobStatus.COMPLETED,
        )
        async_session.add(job)
        await async_session.commit()
        await async_session.refresh(job)

        customer_headers = await self._login_headers(async_client, customer.username)
        create_response = await async_client.post(
            f"/api/v1/jobs/{job.id}/review",
            json={"rating": 5, "comment": "Excellent"},
            headers=customer_headers,
        )
        assert create_response.status_code == 201

        rating_response = await async_client.get(f"/api/v1/workers/{worker_user.id}/rating")
        assert rating_response.status_code == 200
        assert rating_response.json()["average_rating"] == 5.0
        assert rating_response.json()["total_reviews"] == 1

        update_response = await async_client.patch(
            f"/api/v1/jobs/{job.id}/review",
            json={"rating": 3, "comment": "Changed rating"},
            headers=customer_headers,
        )
        assert update_response.status_code == 200

        rating_response_after_update = await async_client.get(f"/api/v1/workers/{worker_user.id}/rating")
        assert rating_response_after_update.status_code == 200
        assert rating_response_after_update.json()["average_rating"] == 3.0
        assert rating_response_after_update.json()["total_reviews"] == 1

        delete_response = await async_client.delete(f"/api/v1/jobs/{job.id}/review", headers=customer_headers)
        assert delete_response.status_code == 200

        rating_response_after_delete = await async_client.get(f"/api/v1/workers/{worker_user.id}/rating")
        assert rating_response_after_delete.status_code == 200
        assert rating_response_after_delete.json()["average_rating"] is None
        assert rating_response_after_delete.json()["total_reviews"] == 0
