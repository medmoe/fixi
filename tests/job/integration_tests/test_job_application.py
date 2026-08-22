from httpx import AsyncClient


class TestCreateJobApplicationEndpoint:
    """POST /jobs/{job_id}/apply"""

    async def test_worker_can_apply(self, async_client: AsyncClient, worker_profile_auth_headers, test_job, test_worker_profile):
        response = await async_client.post(
            f"/api/v1/jobs/{test_job.id}/apply",
            json={"message": "I can start immediately"},
            headers=worker_profile_auth_headers,
        )
        data = response.json()
        assert response.status_code == 201
        assert data["message"] == "I can start immediately"
        assert data["status"] == "pending"

    async def test_apply_without_message_succeeds(self, async_client: AsyncClient, worker_profile_auth_headers, test_job, test_worker_profile):
        response = await async_client.post(
            f"/api/v1/jobs/{test_job.id}/apply", json={}, headers=worker_profile_auth_headers
        )
        assert response.status_code == 201
        assert response.json()["message"] is None

    async def test_customer_cannot_apply(self, async_client: AsyncClient, customer_auth_headers, test_job, test_worker_profile):
        response = await async_client.post(
            f"/api/v1/jobs/{test_job.id}/apply", json={}, headers=customer_auth_headers
        )
        assert response.status_code == 403

    async def test_unauthenticated_cannot_apply(self, async_client: AsyncClient, test_job, test_worker_profile):
        response = await async_client.post(f"/api/v1/jobs/{test_job.id}/apply", json={})
        assert response.status_code == 401

    async def test_apply_to_nonexistent_job_returns_404(self, async_client: AsyncClient, worker_profile_auth_headers, test_worker_profile):
        response = await async_client.post(
            "/api/v1/jobs/999999/apply", json={}, headers=worker_profile_auth_headers
        )
        assert response.status_code == 404

    async def test_apply_to_closed_job_returns_400(
            self, async_client: AsyncClient, worker_profile_auth_headers, closed_job, test_worker_profile
    ):
        response = await async_client.post(
            f"/api/v1/jobs/{closed_job.id}/apply", json={}, headers=worker_profile_auth_headers
        )
        assert response.status_code == 400

    async def test_duplicate_application_returns_400(
            self, async_client: AsyncClient, worker_profile_auth_headers, test_job, test_worker_profile
    ):
        await async_client.post(f"/api/v1/jobs/{test_job.id}/apply", json={}, headers=worker_profile_auth_headers)
        response = await async_client.post(
            f"/api/v1/jobs/{test_job.id}/apply", json={}, headers=worker_profile_auth_headers
        )
        assert response.status_code == 400

    async def test_status_field_in_payload_is_rejected(
            self, async_client: AsyncClient, worker_profile_auth_headers, test_job, test_worker_profile
    ):
        """Security regression test — client cannot set status on create."""
        response = await async_client.post(
            f"/api/v1/jobs/{test_job.id}/apply",
            json={"status": "accepted"},
            headers=worker_profile_auth_headers,
        )
        assert response.status_code == 422

    async def test_message_exceeding_max_length_returns_422(
            self, async_client: AsyncClient, worker_profile_auth_headers, test_job, test_worker_profile
    ):
        response = await async_client.post(
            f"/api/v1/jobs/{test_job.id}/apply",
            json={"message": "a" * 1001},
            headers=worker_profile_auth_headers,
        )
        assert response.status_code == 422


class TestGetJobApplicationsEndpoint:
    """GET /jobs/{job_id}/applications"""

    async def test_owner_can_list_applications(
            self, async_client: AsyncClient, customer_auth_headers, test_job, job_application_factory
    ):
        await job_application_factory(job=test_job, count=3)
        response = await async_client.get(
            f"/api/v1/jobs/{test_job.id}/applications", headers=customer_auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 3
        assert data["total_count"] == 3

    async def test_worker_cannot_list_applications(
            self, async_client: AsyncClient, worker_profile_auth_headers, test_job
    ):
        response = await async_client.get(
            f"/api/v1/jobs/{test_job.id}/applications", headers=worker_profile_auth_headers
        )
        assert response.status_code == 403

    async def test_non_owner_customer_forbidden(
            self, async_client: AsyncClient, other_customer_auth_headers, test_job
    ):
        response = await async_client.get(
            f"/api/v1/jobs/{test_job.id}/applications", headers=other_customer_auth_headers
        )
        assert response.status_code == 403

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient, test_job):
        response = await async_client.get(f"/api/v1/jobs/{test_job.id}/applications")
        assert response.status_code == 401

    async def test_nonexistent_job_returns_404(self, async_client: AsyncClient, customer_auth_headers):
        response = await async_client.get(
            "/api/v1/jobs/999999/applications", headers=customer_auth_headers
        )
        assert response.status_code == 404

    async def test_pagination_page_size(
            self, async_client: AsyncClient, customer_auth_headers, test_job, job_application_factory
    ):
        await job_application_factory(job=test_job, count=10)
        response = await async_client.get(
            f"/api/v1/jobs/{test_job.id}/applications",
            params={"page_size": 3},
            headers=customer_auth_headers,
        )
        data = response.json()
        assert len(data["data"]) == 3
        assert data["total_count"] == 10

    async def test_has_more_true_when_additional_pages_exist(
            self, async_client: AsyncClient, customer_auth_headers, test_job, job_application_factory
    ):
        await job_application_factory(job=test_job, count=10)
        response = await async_client.get(
            f"/api/v1/jobs/{test_job.id}/applications",
            params={"page": 1, "page_size": 5},
            headers=customer_auth_headers,
        )
        assert response.json()["has_more"] is True

    async def test_has_more_false_on_last_page(
            self, async_client: AsyncClient, customer_auth_headers, test_job, job_application_factory
    ):
        await job_application_factory(job=test_job, count=10)
        response = await async_client.get(
            f"/api/v1/jobs/{test_job.id}/applications",
            params={"page": 2, "page_size": 5},
            headers=customer_auth_headers,
        )
        assert response.json()["has_more"] is False

    async def test_empty_result_when_no_applications(
            self, async_client: AsyncClient, customer_auth_headers, test_job
    ):
        response = await async_client.get(
            f"/api/v1/jobs/{test_job.id}/applications", headers=customer_auth_headers
        )
        data = response.json()
        assert data["data"] == []
        assert data["total_count"] == 0


class TestUpdateJobApplicationEndpoint:
    """PATCH /jobs/{job_id}/applications/{app_id}"""

    async def test_owner_can_accept_application(
            self, async_client: AsyncClient, customer_auth_headers, test_job, test_job_application
    ):
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}/applications/{test_job_application.id}",
            json={"status": "accepted"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "accepted"

    async def test_owner_can_reject_application(
            self, async_client: AsyncClient, customer_auth_headers, test_job, test_job_application
    ):
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}/applications/{test_job_application.id}",
            json={"status": "rejected"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "rejected"

    async def test_worker_cannot_update_application(
            self, async_client: AsyncClient, worker_profile_auth_headers, test_job, test_job_application
    ):
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}/applications/{test_job_application.id}",
            json={"status": "accepted"},
            headers=worker_profile_auth_headers,
        )
        assert response.status_code == 403

    async def test_non_owner_customer_forbidden(
            self, async_client: AsyncClient, other_customer_auth_headers, test_job, test_job_application
    ):
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}/applications/{test_job_application.id}",
            json={"status": "accepted"},
            headers=other_customer_auth_headers,
        )
        assert response.status_code == 403

    async def test_unauthenticated_returns_401(
            self, async_client: AsyncClient, test_job, test_job_application
    ):
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}/applications/{test_job_application.id}",
            json={"status": "accepted"},
        )
        assert response.status_code == 401

    async def test_nonexistent_job_returns_404(
            self, async_client: AsyncClient, customer_auth_headers, test_job_application
    ):
        response = await async_client.patch(
            f"/api/v1/jobs/999999/applications/{test_job_application.id}",
            json={"status": "accepted"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 404

    async def test_nonexistent_application_returns_404(
            self, async_client: AsyncClient, customer_auth_headers, test_job
    ):
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}/applications/999999",
            json={"status": "accepted"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 404

    async def test_application_belonging_to_different_job_returns_404(
            self, async_client: AsyncClient, customer_auth_headers, test_job, job_other_user, job_application_factory
    ):
        [application] = await job_application_factory(job=job_other_user, count=1)
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}/applications/{application.id}",
            json={"status": "accepted"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 404

    async def test_invalid_status_value_returns_422(
            self, async_client: AsyncClient, customer_auth_headers, test_job, test_job_application
    ):
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}/applications/{test_job_application.id}",
            json={"status": "not_a_real_status"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 422

    async def test_message_field_is_rejected_on_update(
            self, async_client: AsyncClient, customer_auth_headers, test_job, test_job_application
    ):
        """Job owner cannot edit the applicant's message."""
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}/applications/{test_job_application.id}",
            json={"status": "accepted", "message": "edited by owner"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 422
