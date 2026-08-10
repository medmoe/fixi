from httpx import AsyncClient


class TestCreateJob:
    """POST /api/v1/jobs"""

    async def test_create_job_success(self, async_client: AsyncClient, customer_auth_headers, job_create_payload):
        response = await async_client.post(
            "/api/v1/jobs",
            json=job_create_payload,
            headers=customer_auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == job_create_payload["title"]
        assert data["description"] == job_create_payload["description"]
        assert "id" in data
        assert "created_at" in data

    async def test_create_job_with_location(self, async_client: AsyncClient, customer_auth_headers, job_create_payload):
        job_create_payload["latitude"] = 40.7128
        job_create_payload["longitude"] = -74.0060
        response = await async_client.post(
            "/api/v1/jobs",
            json=job_create_payload,
            headers=customer_auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert "coordinates" in data

    async def test_create_job_lat_without_lng_fails(self, async_client: AsyncClient, customer_auth_headers, job_create_payload):
        job_create_payload["latitude"] = 40.7128
        response = await async_client.post(
            "/api/v1/jobs",
            json=job_create_payload,
            headers=customer_auth_headers,
        )
        assert response.status_code == 422

    async def test_create_job_lng_without_lat_fails(self, async_client: AsyncClient, customer_auth_headers, job_create_payload):
        job_create_payload["longitude"] = -74.0060
        response = await async_client.post(
            "/api/v1/jobs",
            json=job_create_payload,
            headers=customer_auth_headers,
        )
        assert response.status_code == 422

    async def test_create_job_unauthenticated_returns_401(self, async_client: AsyncClient, job_create_payload):
        response = await async_client.post("/api/v1/jobs", json=job_create_payload)
        assert response.status_code == 401

    async def test_create_job_non_customer_role_returns_403(self, async_client: AsyncClient, worker_profile_auth_headers, job_create_payload):
        response = await async_client.post(
            "/api/v1/jobs",
            json=job_create_payload,
            headers=worker_profile_auth_headers,
        )
        assert response.status_code == 403

    async def test_create_job_missing_required_fields_returns_422(self, async_client: AsyncClient, customer_auth_headers):
        response = await async_client.post(
            "/api/v1/jobs",
            json={},
            headers=customer_auth_headers,
        )
        assert response.status_code == 422

    async def test_create_job_invalid_budget_range_returns_422(self, async_client: AsyncClient, customer_auth_headers, job_create_payload):
        # budget_min greater than budget_max
        job_create_payload["budget_min"] = 1000
        job_create_payload["budget_max"] = 100
        response = await async_client.post(
            "/api/v1/jobs",
            json=job_create_payload,
            headers=customer_auth_headers,
        )
        assert response.status_code == 422

    async def test_create_job_sets_status_to_open(self, async_client: AsyncClient, customer_auth_headers, job_create_payload):
        response = await async_client.post(
            "/api/v1/jobs",
            json=job_create_payload,
            headers=customer_auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["status"] == "open"

    async def test_create_job_owner_is_authenticated_user(self, async_client: AsyncClient, customer_auth_headers, job_create_payload, customer_test_user):
        response = await async_client.post(
            "/api/v1/jobs",
            json=job_create_payload,
            headers=customer_auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["user_id"] == customer_test_user.id

    async def test_create_job_response_does_not_expose_internal_fields(self, async_client: AsyncClient, customer_auth_headers, job_create_payload):
        response = await async_client.post(
            "/api/v1/jobs",
            json=job_create_payload,
            headers=customer_auth_headers,
        )
        data = response.json()
        assert "hashed_password" not in data
        assert "location" not in data
