from httpx import AsyncClient


class TestDeleteJob:
    """DELETE /api/v1/jobs/{job_id}"""

    async def test_delete_job_success(self, async_client: AsyncClient, customer_auth_headers, test_job):
        response = await async_client.delete(
            f"/api/v1/jobs/{test_job.id}",
            headers=customer_auth_headers,
        )
        assert response.status_code == 204

    async def test_delete_job_is_soft_delete(self, async_client: AsyncClient, customer_auth_headers, test_job, async_session):
        await async_client.delete(
            f"/api/v1/jobs/{test_job.id}",
            headers=customer_auth_headers,
        )
        await async_session.refresh(test_job)
        assert test_job.is_deleted is True
        assert test_job.deleted_at is not None

    async def test_delete_job_no_longer_accessible_after_delete(self, async_client: AsyncClient, customer_auth_headers, test_job):
        await async_client.delete(
            f"/api/v1/jobs/{test_job.id}",
            headers=customer_auth_headers,
        )
        get_response = await async_client.get(f"/api/v1/jobs/{test_job.id}")
        assert get_response.status_code == 404

    async def test_delete_job_unauthenticated_returns_401(self, async_client: AsyncClient, test_job):
        response = await async_client.delete(f"/api/v1/jobs/{test_job.id}")
        assert response.status_code == 401

    async def test_delete_job_non_owner_returns_403(self, async_client: AsyncClient, other_customer_auth_headers, test_job):
        response = await async_client.delete(
            f"/api/v1/jobs/{test_job.id}",
            headers=other_customer_auth_headers,
        )
        assert response.status_code == 403

    async def test_delete_job_not_found_returns_404(self, async_client: AsyncClient, customer_auth_headers):
        response = await async_client.delete(
            "/api/v1/jobs/99999",
            headers=customer_auth_headers,
        )
        assert response.status_code == 404

    async def test_delete_already_deleted_job_returns_404(self, async_client: AsyncClient, customer_auth_headers, deleted_job):
        response = await async_client.delete(
            f"/api/v1/jobs/{deleted_job.id}",
            headers=customer_auth_headers,
        )
        assert response.status_code == 404

    async def test_delete_job_worker_role_returns_403(self, async_client: AsyncClient, worker_profile_auth_headers, test_job):
        response = await async_client.delete(
            f"/api/v1/jobs/{test_job.id}",
            headers=worker_profile_auth_headers,
        )
        assert response.status_code == 403
