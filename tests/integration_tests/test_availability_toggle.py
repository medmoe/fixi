from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.events import subscribe
from src.app.models import WorkerProfile
from tests.helpers.fakes import FakeRateLimiter


class TestAvailabilityToggle:
    async def test_toggle_on_sets_available_since(
            self,
            async_client_with_redis: AsyncClient,
            async_session: AsyncSession,
            test_worker_profile: WorkerProfile,
            auth_headers: dict,
    ):
        client, _ = async_client_with_redis
        response = await client.patch(
            f"/api/v1/worker-profiles/{test_worker_profile.id}/availability",
            json={"is_available": True},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_available"] is True
        assert data["available_since"] is not None  # ✅ real DB was updated

    async def test_toggle_off_clears_available_since(
            self,
            async_client_with_redis: AsyncClient,
            test_worker_profile: WorkerProfile,
            auth_headers: dict,
    ):
        # first toggle on
        client, _ = async_client_with_redis
        await client.patch(
            f"/api/v1/worker-profiles/{test_worker_profile.id}/availability",
            json={"is_available": True},
            headers=auth_headers,
        )
        # then toggle off
        response = await client.patch(
            f"/api/v1/worker-profiles/{test_worker_profile.id}/availability",
            json={"is_available": False},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_available"] is False
        assert data["available_since"] is None  # ✅ cleared on toggle off

    async def test_unauthorized_returns_403(
            self,
            async_client_with_redis: AsyncClient,
            test_worker_profile: WorkerProfile,
            other_auth_headers: dict,  # different user
    ):
        client, _ = async_client_with_redis
        response = await client.patch(
            f"/api/v1/worker-profiles/{test_worker_profile.id}/availability",
            json={"is_available": True},
            headers=other_auth_headers,
        )
        assert response.status_code == 403

    async def test_unauthenticated_returns_401(
            self,
            async_client_with_redis: AsyncClient,
            test_worker_profile: WorkerProfile,
    ):
        client, _ = async_client_with_redis
        response = await client.patch(
            f"/api/v1/worker-profiles/{test_worker_profile.id}/availability",
            json={"is_available": True},
        )
        assert response.status_code == 401

    async def test_event_published_on_toggle(
            self,
            async_client_with_redis: AsyncClient,
            test_worker_profile: WorkerProfile,
            auth_headers: dict,
    ):
        client, _ = async_client_with_redis
        """Verify the event bus receives the right payload."""
        received_events: list[dict] = []

        async def capture_event(payload: dict) -> None:
            received_events.append(payload)

        # subscribe before the request
        subscribe("worker_profile:availability_changed", capture_event)

        await client.patch(
            f"/api/v1/worker-profiles/{test_worker_profile.id}/availability",
            json={"is_available": True},
            headers=auth_headers,
        )

        assert len(received_events) == 1
        assert received_events[0]["worker_profile_id"] == test_worker_profile.id
        assert received_events[0]["is_available"] is True
        assert received_events[0]["available_since"] is not None


class TestRateLimiting:
    async def test_rate_limit_allows_requests_under_limit(
            self,
            async_client_with_rate_limit: tuple[AsyncClient, FakeRateLimiter],
            test_worker_profile: WorkerProfile,
            auth_headers: dict,
    ):
        client, limiter = async_client_with_rate_limit
        limiter.limit = 10

        response = await client.patch(
            f"/api/v1/worker-profiles/{test_worker_profile.id}/availability",
            json={"is_available": True},
            headers=auth_headers,
        )
        assert response.status_code == 200

    async def test_rate_limit_blocks_after_limit_exceeded(
            self,
            async_client_with_rate_limit: tuple[AsyncClient, FakeRateLimiter],
            test_worker_profile: WorkerProfile,
            auth_headers: dict,
    ):
        client, limiter = async_client_with_rate_limit

        # pre-fill the counter to the limit
        limiter.set_count(user_id=test_worker_profile.user_id, path="/api/v1/worker-profiles/1/availability", count=10)
        response = await client.patch(
            f"/api/v1/worker-profiles/{test_worker_profile.id}/availability",
            json={"is_available": True},
            headers=auth_headers,
        )
        assert response.status_code == 429

    async def test_rate_limit_resets_after_window(
            self,
            async_client_with_rate_limit: tuple[AsyncClient, FakeRateLimiter],
            test_worker_profile: WorkerProfile,
            auth_headers: dict,
    ):
        client, limiter = async_client_with_rate_limit

        # fill to limit
        limiter.set_count(user_id=0, path="/api/v1/worker-profiles/1/availability", count=10)

        # reset simulates window expiry
        limiter.reset()

        response = await client.patch(
            f"/api/v1/worker-profiles/{test_worker_profile.id}/availability",
            json={"is_available": True},
            headers=auth_headers,
        )
        assert response.status_code == 200
