from httpx import AsyncClient


class TestUpdateJob:
    """PATCH /api/v1/jobs/{job_id}"""

    async def test_update_job_success(self, async_client: AsyncClient, customer_auth_headers, test_job):
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}",
            json={"title": "Updated Title"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["title"] == "Updated Title"

    async def test_update_job_partial_only_changes_sent_fields(self, async_client: AsyncClient, customer_auth_headers, test_job):
        original_description = test_job.description
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}",
            json={"title": "New Title Only"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["description"] == original_description

    async def test_update_job_unauthenticated_returns_401(self, async_client: AsyncClient, test_job):
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}",
            json={"title": "New Title"},
        )
        assert response.status_code == 401

    async def test_update_job_non_owner_returns_403(self, async_client: AsyncClient, other_customer_auth_headers, test_job):
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}",
            json={"title": "Stolen Update"},
            headers=other_customer_auth_headers,
        )
        assert response.status_code == 403

    async def test_update_job_not_found_returns_404(self, async_client: AsyncClient, customer_auth_headers):
        response = await async_client.patch(
            "/api/v1/jobs/99999",
            json={"title": "Ghost Update"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 404

    async def test_update_closed_job_returns_400(self, async_client: AsyncClient, customer_auth_headers, closed_job):
        response = await async_client.patch(
            f"/api/v1/jobs/{closed_job.id}",
            json={"title": "Try Update Closed"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 400

    async def test_update_deleted_job_returns_404(self, async_client: AsyncClient, customer_auth_headers, deleted_job):
        response = await async_client.patch(
            f"/api/v1/jobs/{deleted_job.id}",
            json={"title": "Ghost"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 404

    async def test_update_job_worker_role_returns_403(self, async_client: AsyncClient, worker_profile_auth_headers, test_job):
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}",
            json={"title": "Trade Update"},
            headers=worker_profile_auth_headers,
        )
        assert response.status_code == 403

    async def test_update_job_invalid_payload_returns_422(self, async_client: AsyncClient, customer_auth_headers, test_job):
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}",
            json={"budget_min": "not-a-number"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 422
