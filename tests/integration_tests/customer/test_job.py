from decimal import Decimal

import pytest
from httpx import AsyncClient

from src.app.models import UserRole, Job, JobStatus
from src.app.schemas.user import UserReadInternal


# ─── Fixtures and mocks ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


def create_user_read_internal_schema() -> UserReadInternal:
    return UserReadInternal(
        username="customer_test_user_username",
        email="customer@test.com",
        role_type=UserRole.CUSTOMER,
        token_version=1
    )


@pytest.fixture
def job_create_payload(test_trade_category):
    return {
        "title": "Need a plumber urgently",
        "description": "Pipe burst in the kitchen",
        "trade_category_id": test_trade_category.id,
        "budget_min": 100.00,
        "budget_max": 500.00,
    }


@pytest.fixture
async def closed_job(async_session, customer_test_user, test_trade_category):
    job = Job(user_id=customer_test_user.id, trade_category_id=test_trade_category.id,
        title="closed job", status=JobStatus.COMPLETED,
        budget_min=Decimal(100), budget_max=Decimal(200), description="description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest.fixture
async def many_jobs(async_session, customer_test_user, test_trade_category):
    jobs = [
        Job(user_id=customer_test_user.id, trade_category_id=test_trade_category.id,
            title=f"job {i}", status=JobStatus.OPEN,
            budget_min=Decimal(100), budget_max=Decimal(300), description="description")
        for i in range(25)
    ]
    async_session.add_all(jobs)
    await async_session.commit()
    return jobs


# ─── Test Job Creation ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


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
        assert "location" in data

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

    async def test_create_job_non_customer_role_returns_403(self, async_client: AsyncClient, tradesperson_token_headers, job_create_payload):
        response = await async_client.post(
            "/api/v1/jobs",
            json=job_create_payload,
            headers=tradesperson_token_headers,
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
        assert "is_deleted" not in data


# ─── Test Job retrival ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
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


# ─── Test Job Update ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
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

    async def test_update_job_tradesperson_role_returns_403(self, async_client: AsyncClient, tradesperson_token_headers, test_job):
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}",
            json={"title": "Trade Update"},
            headers=tradesperson_token_headers,
        )
        assert response.status_code == 403

    async def test_update_job_invalid_payload_returns_422(self, async_client: AsyncClient, customer_auth_headers, test_job):
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}",
            json={"budget_min": "not-a-number"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 422


# ─── Test Job Deletion ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
class TestDeleteJob:
    """DELETE /api/v1/jobs/{job_id}"""

    async def test_delete_job_success(self, async_client: AsyncClient, customer_auth_headers, test_job):
        response = await async_client.delete(
            f"/api/v1/jobs/{test_job.id}",
            headers=customer_auth_headers,
        )
        assert response.status_code == 200

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

    async def test_delete_job_tradesperson_role_returns_403(self, async_client: AsyncClient, tradesperson_token_headers, test_job):
        response = await async_client.delete(
            f"/api/v1/jobs/{test_job.id}",
            headers=tradesperson_token_headers,
        )
        assert response.status_code == 403


# ─── Test Job list retrieval ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
class TestListJobs:
    """GET /api/v1/jobs"""

    async def test_list_jobs_public(self, async_client: AsyncClient, test_job):
        response = await async_client.get("/api/v1/jobs")
        assert response.status_code == 200

    async def test_list_jobs_response_shape(self, async_client: AsyncClient, test_job):
        response = await async_client.get("/api/v1/jobs")
        data = response.json()
        assert "data" in data
        assert "total_count" in data
        assert isinstance(data["data"], list)

    async def test_list_jobs_excludes_deleted(self, async_client: AsyncClient, test_job, deleted_job):
        response = await async_client.get("/api/v1/jobs")
        ids = [j["id"] for j in response.json()["data"]]
        assert test_job.id in ids
        assert deleted_job.id not in ids

    async def test_list_jobs_default_pagination(self, async_client: AsyncClient, many_jobs):
        response = await async_client.get("/api/v1/jobs")
        assert len(response.json()["data"]) <= 20

    async def test_list_jobs_custom_limit(self, async_client: AsyncClient, many_jobs):
        response = await async_client.get("/api/v1/jobs?limit=3")
        assert len(response.json()["data"]) == 3

    async def test_list_jobs_offset(self, async_client: AsyncClient, many_jobs):
        all_response = await async_client.get("/api/v1/jobs?limit=10")
        offset_response = await async_client.get("/api/v1/jobs?limit=10&offset=2")
        all_ids = [j["id"] for j in all_response.json()["data"]]
        offset_ids = [j["id"] for j in offset_response.json()["data"]]
        assert all_ids[0] not in offset_ids
        assert all_ids[1] not in offset_ids

    async def test_list_jobs_filter_by_status(self, async_client: AsyncClient, open_job, closed_job):
        response = await async_client.get("/api/v1/jobs?status=open")
        ids = [j["id"] for j in response.json()["data"]]
        assert open_job.id in ids
        assert closed_job.id not in ids

    async def test_list_jobs_filter_by_trade_category(self, async_client: AsyncClient, test_job, job_with_different_trade_category, test_trade_category):
        response = await async_client.get(f"/api/v1/jobs?trade_category_id={test_trade_category.id}")
        ids = [j["id"] for j in response.json()["data"]]
        assert test_job.id in ids
        assert job_with_different_trade_category.id not in ids

    async def test_list_jobs_filter_by_user_id(self, async_client: AsyncClient, test_job, job_other_user, customer_test_user):
        response = await async_client.get(f"/api/v1/jobs?user_id={customer_test_user.id}")
        ids = [j["id"] for j in response.json()["data"]]
        assert test_job.id in ids
        assert job_other_user.id not in ids

    async def test_list_jobs_search_by_title(self, async_client: AsyncClient, job_with_title_plumber):
        response = await async_client.get("/api/v1/jobs?search=plumber")
        ids = [j["id"] for j in response.json()["data"]]
        assert job_with_title_plumber.id in ids

    async def test_list_jobs_search_by_description(self, async_client: AsyncClient, job_with_desc_keyword):
        response = await async_client.get("/api/v1/jobs?search=urgent+repair")
        ids = [j["id"] for j in response.json()["data"]]
        assert job_with_desc_keyword.id in ids

    async def test_list_jobs_search_case_insensitive(self, async_client: AsyncClient, job_with_title_plumber):
        response = await async_client.get("/api/v1/jobs?search=PLUMBER")
        ids = [j["id"] for j in response.json()["data"]]
        assert job_with_title_plumber.id in ids

    async def test_list_jobs_search_no_match_returns_empty(self, async_client: AsyncClient, test_job):
        response = await async_client.get("/api/v1/jobs?search=zzz_no_match_xyz")
        assert response.json()["data"] == []

    async def test_list_jobs_filter_budget_min(self, async_client: AsyncClient, high_budget_job, low_budget_job):
        response = await async_client.get("/api/v1/jobs?budget_min=500")
        ids = [j["id"] for j in response.json()["data"]]
        assert high_budget_job.id in ids
        assert low_budget_job.id not in ids

    async def test_list_jobs_filter_budget_max(self, async_client: AsyncClient, high_budget_job, low_budget_job):
        response = await async_client.get("/api/v1/jobs?budget_max=300")
        ids = [j["id"] for j in response.json()["data"]]
        assert low_budget_job.id in ids
        assert high_budget_job.id not in ids

    async def test_list_jobs_unauthenticated_succeeds(self, async_client: AsyncClient, test_job):
        """Public endpoint — no token required."""
        response = await async_client.get("/api/v1/jobs")
        assert response.status_code == 200
