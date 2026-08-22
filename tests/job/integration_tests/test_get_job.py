from httpx import AsyncClient


class TestGetJob:
    """GET /api/v1/jobs/{job_id}"""

    async def test_get_job_success_public(self, async_client: AsyncClient, test_job):
        response = await async_client.get(f"/api/v1/jobs/{test_job.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_job.id
        assert data["title"] == test_job.title

    async def test_get_job_includes_trade_details(self, async_client: AsyncClient, test_job, test_trade_category):
        response = await async_client.get(f"/api/v1/jobs/{test_job.id}")
        assert response.status_code == 200
        data = response.json()
        assert "trade_category" in data
        assert data["trade_category"]["id"] == test_trade_category.id

    async def test_get_job_not_found_returns_404(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/jobs/99999")
        assert response.status_code == 404

    async def test_get_deleted_job_returns_404(self, async_client: AsyncClient, deleted_job):
        response = await async_client.get(f"/api/v1/jobs/{deleted_job.id}")
        assert response.status_code == 404

    async def test_get_job_unauthenticated_succeeds(self, async_client: AsyncClient, test_job):
        """Public endpoint — no token required."""
        response = await async_client.get(f"/api/v1/jobs/{test_job.id}")
        assert response.status_code == 200
