from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import JobStatus, TradeCategory, User, WorkerProfile
from tests.analytics.conftest import create_application, create_job


class TestGetOverview:
    """GET /api/v1/admin/analytics/overview"""

    async def test_admin_can_view_overview(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers,
            customer_test_user: User, test_trade_category: TradeCategory,
    ):
        await create_job(async_session, customer_test_user, test_trade_category, status=JobStatus.COMPLETED)

        response = await async_client.get("/api/v1/admin/analytics/overview", headers=admin_auth_headers)

        assert response.status_code == 200
        body = response.json()
        assert body["jobs_posted"] == 1
        assert body["jobs_completed"] == 1
        assert "daily" in body

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers):
        response = await async_client.get("/api/v1/admin/analytics/overview", headers=auth_headers)
        assert response.status_code == 403

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/admin/analytics/overview")
        assert response.status_code == 401


class TestGetBreakdown:
    """GET /api/v1/admin/analytics/breakdown"""

    async def test_admin_can_view_breakdown(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers,
            customer_test_user: User, test_trade_category: TradeCategory,
    ):
        await create_job(async_session, customer_test_user, test_trade_category, display_location="Algiers")

        response = await async_client.get("/api/v1/admin/analytics/breakdown", headers=admin_auth_headers)

        assert response.status_code == 200
        body = response.json()
        assert any(item["job_count"] == 1 for item in body["by_trade_category"])
        assert any(item["location"] == "Algiers" for item in body["by_location"])

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers):
        response = await async_client.get("/api/v1/admin/analytics/breakdown", headers=auth_headers)
        assert response.status_code == 403

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/admin/analytics/breakdown")
        assert response.status_code == 401


class TestGetFunnel:
    """GET /api/v1/admin/analytics/funnel"""

    async def test_admin_can_view_funnel(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers,
            customer_test_user: User, test_trade_category: TradeCategory, test_worker_profile: WorkerProfile,
    ):
        job = await create_job(async_session, customer_test_user, test_trade_category)
        await create_application(async_session, job, test_worker_profile)

        response = await async_client.get("/api/v1/admin/analytics/funnel", headers=admin_auth_headers)

        assert response.status_code == 200
        body = response.json()
        assert body["posted"] == 1
        assert body["applied"] == 1
        assert body["accepted"] == 0
        assert body["completed"] == 0

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers):
        response = await async_client.get("/api/v1/admin/analytics/funnel", headers=auth_headers)
        assert response.status_code == 403

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/admin/analytics/funnel")
        assert response.status_code == 401
