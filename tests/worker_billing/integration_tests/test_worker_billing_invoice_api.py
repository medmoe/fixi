from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_test_worker_billing


class TestDownloadInvoice:
    """GET /api/v1/worker-billing/{worker_billing_id}/invoice"""

    async def test_owner_can_download_their_invoice(
            self, async_client: AsyncClient, async_session: AsyncSession, auth_headers, test_job, test_worker_profile
    ):
        billing = await create_test_worker_billing(async_session, test_worker_profile, test_job)

        response = await async_client.get(f"/api/v1/worker-billing/{billing.id}/invoice", headers=auth_headers)

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert response.content.startswith(b"%PDF")
        assert f'invoice-{billing.id}.pdf' in response.headers["content-disposition"]

    async def test_admin_can_download_any_invoice(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers, test_job, test_worker_profile
    ):
        billing = await create_test_worker_billing(async_session, test_worker_profile, test_job)

        response = await async_client.get(f"/api/v1/worker-billing/{billing.id}/invoice", headers=admin_auth_headers)

        assert response.status_code == 200
        assert response.content.startswith(b"%PDF")

    async def test_forbidden_for_another_worker(
            self, async_client: AsyncClient, async_session: AsyncSession, other_auth_headers, test_job, test_worker_profile
    ):
        billing = await create_test_worker_billing(async_session, test_worker_profile, test_job)

        response = await async_client.get(f"/api/v1/worker-billing/{billing.id}/invoice", headers=other_auth_headers)

        assert response.status_code == 403

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient, async_session: AsyncSession, test_job, test_worker_profile):
        billing = await create_test_worker_billing(async_session, test_worker_profile, test_job)

        response = await async_client.get(f"/api/v1/worker-billing/{billing.id}/invoice")

        assert response.status_code == 401

    async def test_nonexistent_record_returns_404(self, async_client: AsyncClient, admin_auth_headers):
        response = await async_client.get("/api/v1/worker-billing/999999/invoice", headers=admin_auth_headers)
        assert response.status_code == 404

    async def test_second_download_returns_the_same_stored_invoice(
            self, async_client: AsyncClient, async_session: AsyncSession, auth_headers, test_job, test_worker_profile
    ):
        billing = await create_test_worker_billing(async_session, test_worker_profile, test_job)

        first = await async_client.get(f"/api/v1/worker-billing/{billing.id}/invoice", headers=auth_headers)
        second = await async_client.get(f"/api/v1/worker-billing/{billing.id}/invoice", headers=auth_headers)

        assert first.status_code == 200
        assert second.status_code == 200
        assert first.content == second.content
