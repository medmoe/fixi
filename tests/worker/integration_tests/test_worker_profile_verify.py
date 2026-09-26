from unittest.mock import AsyncMock, patch

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import WorkerProfile


class TestVerifyWorkerProfile:
    """PATCH /api/v1/worker-profile/{worker_profile_id}/verify"""

    @patch("src.app.services.worker_verification_service.notify_user", new_callable=AsyncMock)
    async def test_admin_can_verify_a_worker_profile(
            self, mock_notify, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers, test_worker_profile: WorkerProfile
    ):
        assert test_worker_profile.is_verified is False

        response = await async_client.patch(
            f"/api/v1/worker-profile/{test_worker_profile.id}/verify", headers=admin_auth_headers
        )

        assert response.status_code == 200
        assert response.json()["is_verified"] is True
        await async_session.refresh(test_worker_profile)
        assert test_worker_profile.is_verified is True

    @patch("src.app.services.worker_verification_service.notify_user", new_callable=AsyncMock)
    async def test_notifies_the_worker(
            self, mock_notify, async_client: AsyncClient, admin_auth_headers, test_worker_profile: WorkerProfile
    ):
        await async_client.patch(f"/api/v1/worker-profile/{test_worker_profile.id}/verify", headers=admin_auth_headers)

        mock_notify.assert_awaited_once()
        kwargs = mock_notify.await_args.kwargs
        assert kwargs["event_type"] == "worker_verification_approved"
        assert kwargs["user_id"] == test_worker_profile.user_id
        assert "email_payload" in kwargs

    @patch("src.app.services.worker_verification_service.notify_user", new_callable=AsyncMock)
    async def test_verifying_an_already_verified_profile_does_not_notify_again(
            self, mock_notify, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers, test_worker_profile: WorkerProfile
    ):
        test_worker_profile.is_verified = True
        await async_session.commit()

        response = await async_client.patch(
            f"/api/v1/worker-profile/{test_worker_profile.id}/verify", headers=admin_auth_headers
        )

        assert response.status_code == 200
        mock_notify.assert_not_awaited()

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers, test_worker_profile: WorkerProfile):
        response = await async_client.patch(f"/api/v1/worker-profile/{test_worker_profile.id}/verify", headers=auth_headers)
        assert response.status_code == 403

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient, test_worker_profile: WorkerProfile):
        response = await async_client.patch(f"/api/v1/worker-profile/{test_worker_profile.id}/verify")
        assert response.status_code == 401

    async def test_nonexistent_worker_profile_returns_404(self, async_client: AsyncClient, admin_auth_headers):
        response = await async_client.patch("/api/v1/worker-profile/999999/verify", headers=admin_auth_headers)
        assert response.status_code == 404
