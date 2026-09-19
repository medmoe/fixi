from httpx import AsyncClient

from src.app.models import ApplicationStatus, JobApplication, JobStatus


async def _accept_application(async_session, job, worker_profile) -> JobApplication:
    application = JobApplication(job_id=job.id, worker_profile_id=worker_profile.id, status=ApplicationStatus.ACCEPTED)
    async_session.add(application)
    await async_session.commit()
    await async_session.refresh(application)
    return application


class TestGetMyApplicationEndpoint:
    """GET /jobs/{job_id}/my-application"""

    async def test_returns_own_application(
            self, async_client: AsyncClient, worker_profile_auth_headers, test_job, test_job_application
    ):
        response = await async_client.get(f"/api/v1/jobs/{test_job.id}/my-application", headers=worker_profile_auth_headers)
        assert response.status_code == 200
        assert response.json()["id"] == test_job_application.id

    async def test_returns_null_when_never_applied(
            self, async_client: AsyncClient, worker_profile_auth_headers, test_job
    ):
        response = await async_client.get(f"/api/v1/jobs/{test_job.id}/my-application", headers=worker_profile_auth_headers)
        assert response.status_code == 200
        assert response.json() is None

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient, test_job):
        response = await async_client.get(f"/api/v1/jobs/{test_job.id}/my-application")
        assert response.status_code == 401


class TestConfirmApplicationEndpoint:
    """POST /jobs/{job_id}/applications/{app_id}/confirm"""

    async def test_worker_confirms_and_job_becomes_assigned(
            self, async_client: AsyncClient, async_session, worker_profile_auth_headers, test_job, test_worker_profile
    ):
        application = await _accept_application(async_session, test_job, test_worker_profile)

        response = await async_client.post(
            f"/api/v1/jobs/{test_job.id}/applications/{application.id}/confirm",
            headers=worker_profile_auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "accepted"
        assert data["worker_confirmed_at"] is not None

    async def test_other_user_cannot_confirm(
            self, async_client: AsyncClient, async_session, other_auth_headers, test_job, test_worker_profile
    ):
        application = await _accept_application(async_session, test_job, test_worker_profile)

        response = await async_client.post(
            f"/api/v1/jobs/{test_job.id}/applications/{application.id}/confirm",
            headers=other_auth_headers,
        )
        assert response.status_code == 403

    async def test_unauthenticated_cannot_confirm(self, async_client: AsyncClient, async_session, test_job, test_worker_profile):
        application = await _accept_application(async_session, test_job, test_worker_profile)
        response = await async_client.post(f"/api/v1/jobs/{test_job.id}/applications/{application.id}/confirm")
        assert response.status_code == 401

    async def test_confirming_nonexistent_application_returns_404(
            self, async_client: AsyncClient, worker_profile_auth_headers, test_job
    ):
        response = await async_client.post(
            f"/api/v1/jobs/{test_job.id}/applications/999999/confirm",
            headers=worker_profile_auth_headers,
        )
        assert response.status_code == 404

    async def test_confirming_pending_application_returns_400(
            self, async_client: AsyncClient, worker_profile_auth_headers, test_job, test_worker_profile, test_job_application
    ):
        """test_job_application fixture creates a still-PENDING application."""
        response = await async_client.post(
            f"/api/v1/jobs/{test_job.id}/applications/{test_job_application.id}/confirm",
            headers=worker_profile_auth_headers,
        )
        assert response.status_code == 400


class TestWithdrawApplicationEndpoint:
    """POST /jobs/{job_id}/applications/{app_id}/withdraw"""

    async def test_worker_withdraws_with_reason(
            self, async_client: AsyncClient, async_session, worker_profile_auth_headers, test_job, test_worker_profile
    ):
        application = await _accept_application(async_session, test_job, test_worker_profile)

        response = await async_client.post(
            f"/api/v1/jobs/{test_job.id}/applications/{application.id}/withdraw",
            json={"decline_reason": "schedule_conflict"},
            headers=worker_profile_auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "rejected"
        assert data["decline_reason"] == "schedule_conflict"

    async def test_withdraw_without_reason_returns_422(
            self, async_client: AsyncClient, async_session, worker_profile_auth_headers, test_job, test_worker_profile
    ):
        application = await _accept_application(async_session, test_job, test_worker_profile)

        response = await async_client.post(
            f"/api/v1/jobs/{test_job.id}/applications/{application.id}/withdraw",
            json={},
            headers=worker_profile_auth_headers,
        )
        assert response.status_code == 422


class TestJobApplicationUpdateReasonRequirement:
    """PATCH /jobs/{job_id}/applications/{app_id} -- decline_reason requirement"""

    async def test_rejecting_without_reason_returns_422(
            self, async_client: AsyncClient, customer_auth_headers, test_job, test_job_application
    ):
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}/applications/{test_job_application.id}",
            json={"status": "rejected"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 422

    async def test_rejecting_with_reason_succeeds(
            self, async_client: AsyncClient, customer_auth_headers, test_job, test_job_application
    ):
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}/applications/{test_job_application.id}",
            json={"status": "rejected", "decline_reason": "scope_mismatch"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["decline_reason"] == "scope_mismatch"

    async def test_accepting_reason_together_returns_422(
            self, async_client: AsyncClient, customer_auth_headers, test_job, test_job_application
    ):
        """decline_reason is only valid alongside status=rejected."""
        response = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}/applications/{test_job_application.id}",
            json={"status": "accepted", "decline_reason": "scope_mismatch"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 422

    async def test_cannot_accept_a_second_application_while_one_is_already_accepted(
            self, async_client: AsyncClient, async_session, customer_auth_headers, test_job, test_job_application,
            job_application_factory,
    ):
        [second_application] = await job_application_factory(job=test_job, count=1)

        accept_first = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}/applications/{test_job_application.id}",
            json={"status": "accepted"},
            headers=customer_auth_headers,
        )
        assert accept_first.status_code == 200

        accept_second = await async_client.patch(
            f"/api/v1/jobs/{test_job.id}/applications/{second_application.id}",
            json={"status": "accepted"},
            headers=customer_auth_headers,
        )
        assert accept_second.status_code == 400


class TestStartAndCompleteJobEndpoints:
    """POST /jobs/{job_id}/start and POST /jobs/{job_id}/complete"""

    async def test_worker_starts_assigned_job(
            self, async_client: AsyncClient, async_session, worker_profile_auth_headers, test_job, test_worker_profile
    ):
        await _accept_application(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.ASSIGNED
        await async_session.commit()

        response = await async_client.post(f"/api/v1/jobs/{test_job.id}/start", headers=worker_profile_auth_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "in_progress"

    async def test_customer_cannot_start_job(
            self, async_client: AsyncClient, async_session, customer_auth_headers, test_job, test_worker_profile
    ):
        await _accept_application(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.ASSIGNED
        await async_session.commit()

        response = await async_client.post(f"/api/v1/jobs/{test_job.id}/start", headers=customer_auth_headers)
        assert response.status_code == 403

    async def test_job_completes_once_both_sides_confirm(
            self, async_client: AsyncClient, async_session, customer_auth_headers, worker_profile_auth_headers,
            test_job, test_worker_profile,
    ):
        await _accept_application(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.IN_PROGRESS
        await async_session.commit()

        customer_response = await async_client.post(f"/api/v1/jobs/{test_job.id}/complete", headers=customer_auth_headers)
        assert customer_response.status_code == 200
        assert customer_response.json()["status"] == "in_progress"

        worker_response = await async_client.post(f"/api/v1/jobs/{test_job.id}/complete", headers=worker_profile_auth_headers)
        assert worker_response.status_code == 200
        assert worker_response.json()["status"] == "completed"

    async def test_unrelated_user_cannot_complete_job(
            self, async_client: AsyncClient, async_session, other_auth_headers, test_job, test_worker_profile
    ):
        await _accept_application(async_session, test_job, test_worker_profile)
        test_job.status = JobStatus.IN_PROGRESS
        await async_session.commit()

        response = await async_client.post(f"/api/v1/jobs/{test_job.id}/complete", headers=other_auth_headers)
        assert response.status_code == 403
