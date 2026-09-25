from unittest.mock import AsyncMock, patch

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import WorkerProfile


class TestListWorkerVerifications:
    """GET /api/v1/admin/worker-verifications"""

    async def test_admin_can_list_pending_verifications(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers, test_worker_profile: WorkerProfile
    ):
        test_worker_profile.cni_document_key = "cni/1.pdf"
        await async_session.commit()

        response = await async_client.get("/api/v1/admin/worker-verifications", headers=admin_auth_headers)

        assert response.status_code == 200
        assert any(row["id"] == test_worker_profile.id for row in response.json())

    async def test_excludes_profiles_without_a_document(
            self, async_client: AsyncClient, admin_auth_headers, test_worker_profile: WorkerProfile
    ):
        response = await async_client.get("/api/v1/admin/worker-verifications", headers=admin_auth_headers)

        assert response.status_code == 200
        assert all(row["id"] != test_worker_profile.id for row in response.json())

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers):
        response = await async_client.get("/api/v1/admin/worker-verifications", headers=auth_headers)
        assert response.status_code == 403

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/admin/worker-verifications")
        assert response.status_code == 401


class TestGetDocumentUrl:
    """GET /api/v1/admin/worker-verifications/{id}/document-url"""

    async def test_returns_a_signed_url(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers, test_worker_profile: WorkerProfile, monkeypatch
    ):
        test_worker_profile.cni_document_key = "cni/1.pdf"
        await async_session.commit()
        monkeypatch.setattr(
            "src.app.services.worker_verification_service.minio_client.generate_presigned_get_url",
            lambda **kwargs: "https://signed.example.com/cni/1.pdf",
        )

        response = await async_client.get(f"/api/v1/admin/worker-verifications/{test_worker_profile.id}/document-url", headers=admin_auth_headers)

        assert response.status_code == 200
        assert response.json()["url"] == "https://signed.example.com/cni/1.pdf"

    async def test_404_when_no_document_uploaded(
            self, async_client: AsyncClient, admin_auth_headers, test_worker_profile: WorkerProfile
    ):
        response = await async_client.get(f"/api/v1/admin/worker-verifications/{test_worker_profile.id}/document-url", headers=admin_auth_headers)
        assert response.status_code == 404

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers, test_worker_profile: WorkerProfile):
        response = await async_client.get(f"/api/v1/admin/worker-verifications/{test_worker_profile.id}/document-url", headers=auth_headers)
        assert response.status_code == 403


class TestApproveVerification:
    """POST /api/v1/admin/worker-verifications/{id}/approve"""

    @patch("src.app.services.worker_verification_service.notify_user", new_callable=AsyncMock)
    async def test_admin_can_approve(
            self, mock_notify, async_client: AsyncClient, admin_auth_headers, test_worker_profile: WorkerProfile
    ):
        response = await async_client.post(f"/api/v1/admin/worker-verifications/{test_worker_profile.id}/approve", headers=admin_auth_headers)

        assert response.status_code == 200
        assert response.json()["is_verified"] is True

    @patch("src.app.services.worker_verification_service.notify_user", new_callable=AsyncMock)
    async def test_sends_the_approved_notification(
            self, mock_notify, async_client: AsyncClient, admin_auth_headers, test_worker_profile: WorkerProfile
    ):
        await async_client.post(f"/api/v1/admin/worker-verifications/{test_worker_profile.id}/approve", headers=admin_auth_headers)

        mock_notify.assert_awaited_once()
        assert mock_notify.await_args.kwargs["event_type"] == "worker_verification_approved"

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers, test_worker_profile: WorkerProfile):
        response = await async_client.post(f"/api/v1/admin/worker-verifications/{test_worker_profile.id}/approve", headers=auth_headers)
        assert response.status_code == 403

    async def test_404_for_a_missing_profile(self, async_client: AsyncClient, admin_auth_headers):
        response = await async_client.post("/api/v1/admin/worker-verifications/999999/approve", headers=admin_auth_headers)
        assert response.status_code == 404


class TestRejectVerification:
    """POST /api/v1/admin/worker-verifications/{id}/reject"""

    @patch("src.app.services.worker_verification_service.notify_user", new_callable=AsyncMock)
    async def test_admin_can_reject_with_a_reason(
            self, mock_notify, async_client: AsyncClient, admin_auth_headers, test_worker_profile: WorkerProfile
    ):
        response = await async_client.post(
            f"/api/v1/admin/worker-verifications/{test_worker_profile.id}/reject",
            json={"reason": "Document is blurry"}, headers=admin_auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["is_verified"] is False

    async def test_reason_is_required(self, async_client: AsyncClient, admin_auth_headers, test_worker_profile: WorkerProfile):
        response = await async_client.post(
            f"/api/v1/admin/worker-verifications/{test_worker_profile.id}/reject", json={}, headers=admin_auth_headers,
        )
        assert response.status_code == 422

    @patch("src.app.services.worker_verification_service.notify_user", new_callable=AsyncMock)
    async def test_already_verified_returns_400(
            self, mock_notify, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers, test_worker_profile: WorkerProfile
    ):
        test_worker_profile.is_verified = True
        await async_session.commit()

        response = await async_client.post(
            f"/api/v1/admin/worker-verifications/{test_worker_profile.id}/reject",
            json={"reason": "Document is blurry"}, headers=admin_auth_headers,
        )

        assert response.status_code == 400

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers, test_worker_profile: WorkerProfile):
        response = await async_client.post(
            f"/api/v1/admin/worker-verifications/{test_worker_profile.id}/reject",
            json={"reason": "Document is blurry"}, headers=auth_headers,
        )
        assert response.status_code == 403


class TestFullVerificationFlow:
    """A pending queue item disappears after rejection and requires resubmission."""

    @patch("src.app.services.worker_verification_service.notify_user", new_callable=AsyncMock)
    async def test_rejected_profile_leaves_the_queue_until_resubmitted(
            self, mock_notify, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers, test_worker_profile: WorkerProfile
    ):
        test_worker_profile.cni_document_key = "cni/1.pdf"
        await async_session.commit()

        list_before = await async_client.get("/api/v1/admin/worker-verifications", headers=admin_auth_headers)
        assert any(row["id"] == test_worker_profile.id for row in list_before.json())

        await async_client.post(
            f"/api/v1/admin/worker-verifications/{test_worker_profile.id}/reject",
            json={"reason": "Document is blurry"}, headers=admin_auth_headers,
        )

        list_after = await async_client.get("/api/v1/admin/worker-verifications", headers=admin_auth_headers)
        assert all(row["id"] != test_worker_profile.id for row in list_after.json())
