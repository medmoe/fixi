"""
ClientCacheMiddleware previously set `Cache-Control: public, max-age=60` on every
response, including GET /jobs/{id}, /jobs/{id}/my-application and
/jobs/{id}/applications. Those endpoints reflect state that changes based on other
users' actions (accepting an application, confirming, starting, completing a job),
so the browser's own HTTP cache would keep serving a stale response for up to 60
seconds -- or longer, since revisiting the same URL within that window just re-hits
the cache -- even though React Query had correctly invalidated and re-requested.
Only a hard refresh (which bypasses the HTTP cache entirely) showed the real state.

The fix: default to `no-store` unless a route explicitly opts into caching by
setting its own `Cache-Control` header (as /trade-categories does).
"""
from httpx import AsyncClient

from src.app.models import ApplicationStatus, JobApplication


class TestNoCacheByDefault:
    """Endpoints that don't opt in must never be cached."""

    async def test_get_job_is_not_cached(self, async_client: AsyncClient, test_job):
        response = await async_client.get(f"/api/v1/jobs/{test_job.id}")
        assert response.headers["Cache-Control"] == "no-store"

    async def test_get_my_application_is_not_cached(
            self, async_client: AsyncClient, worker_profile_auth_headers, test_job
    ):
        response = await async_client.get(
            f"/api/v1/jobs/{test_job.id}/my-application", headers=worker_profile_auth_headers
        )
        assert response.headers["Cache-Control"] == "no-store"

    async def test_get_job_applications_is_not_cached(
            self, async_client: AsyncClient, customer_auth_headers, test_job
    ):
        response = await async_client.get(
            f"/api/v1/jobs/{test_job.id}/applications", headers=customer_auth_headers
        )
        assert response.headers["Cache-Control"] == "no-store"

    async def test_get_my_jobs_is_not_cached(self, async_client: AsyncClient, customer_auth_headers):
        response = await async_client.get("/api/v1/jobs/my", headers=customer_auth_headers)
        assert response.headers["Cache-Control"] == "no-store"

    async def test_status_changes_are_immediately_visible_on_refetch(
            self, async_client: AsyncClient, async_session, worker_profile_auth_headers, test_job, test_worker_profile
    ):
        """Regression guard for the actual reported symptom: confirm the
        application, then re-GET the job — the new status must come back
        without needing any client-side cache-busting trick."""
        application = JobApplication(
            job_id=test_job.id, worker_profile_id=test_worker_profile.id, status=ApplicationStatus.ACCEPTED
        )
        async_session.add(application)
        await async_session.commit()
        await async_session.refresh(application)

        await async_client.post(
            f"/api/v1/jobs/{test_job.id}/applications/{application.id}/confirm",
            headers=worker_profile_auth_headers,
        )

        response = await async_client.get(f"/api/v1/jobs/{test_job.id}")
        assert response.json()["status"] == "assigned"


class TestCachingOptIn:
    """A route that explicitly sets its own Cache-Control header keeps it."""

    async def test_trade_categories_keeps_its_own_cache_header(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/trade-categories")
        assert response.headers["Cache-Control"] == "public, max-age=3600"
