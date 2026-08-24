from httpx import AsyncClient


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
        assert "has_more" in data
        assert "page" in data
        assert "items_per_page" in data
        assert isinstance(data["data"], list)

    async def test_list_jobs_excludes_deleted(self, async_client: AsyncClient, test_job, deleted_job):
        response = await async_client.get("/api/v1/jobs")
        ids = [j["id"] for j in response.json()["data"]]
        assert test_job.id in ids
        assert deleted_job.id not in ids

    async def test_list_jobs_default_page_size(self, async_client: AsyncClient, many_jobs):
        # many_jobs creates 55 jobs; default page_size=50 so first page has 50
        response = await async_client.get("/api/v1/jobs")
        assert response.status_code == 200
        assert len(response.json()["data"]) == 50

    async def test_list_jobs_custom_page_size(self, async_client: AsyncClient, many_jobs):
        response = await async_client.get("/api/v1/jobs", params={"page_size": 3})
        assert response.status_code == 200
        assert len(response.json()["data"]) == 3

    async def test_list_jobs_page_2_returns_next_set(self, async_client: AsyncClient, many_jobs):
        page_1 = await async_client.get("/api/v1/jobs", params={"page": 1, "page_size": 10})
        page_2 = await async_client.get("/api/v1/jobs", params={"page": 2, "page_size": 10})
        page_1_ids = [j["id"] for j in page_1.json()["data"]]
        page_2_ids = [j["id"] for j in page_2.json()["data"]]
        # no overlap between pages
        assert not set(page_1_ids) & set(page_2_ids)

    async def test_list_jobs_has_more_true_when_more_pages_exist(self, async_client: AsyncClient, many_jobs):
        # many_jobs has 55 jobs, page_size=10 → has_more should be True on page 1
        response = await async_client.get("/api/v1/jobs", params={"page": 1, "page_size": 10})
        assert response.json()["has_more"] is True

    async def test_list_jobs_has_more_false_on_last_page(self, async_client: AsyncClient, many_jobs):
        response = await async_client.get("/api/v1/jobs", params={"page": 6, "page_size": 10})
        assert response.json()["has_more"] is False

    async def test_list_jobs_total_count(self, async_client: AsyncClient, many_jobs):
        response = await async_client.get("/api/v1/jobs", params={"page_size": 5})
        assert response.json()["total_count"] == 55

    async def test_list_jobs_beyond_last_page_returns_empty(self, async_client: AsyncClient, many_jobs):
        response = await async_client.get("/api/v1/jobs", params={"page": 999, "page_size": 50})
        assert response.json()["data"] == []

    async def test_list_jobs_filter_by_status(self, async_client: AsyncClient, open_job, closed_job):
        response = await async_client.get("/api/v1/jobs", params={"status": "open"})
        ids = [j["id"] for j in response.json()["data"]]
        assert open_job.id in ids
        assert closed_job.id not in ids

    async def test_list_jobs_filter_by_trade_category(
            self, async_client: AsyncClient, test_job, other_trade_category, test_trade_category
    ):
        response = await async_client.get(
            "/api/v1/jobs", params={"trade_category_id": test_trade_category.id}
        )
        ids = [j["id"] for j in response.json()["data"]]
        assert test_job.id in ids
        assert other_trade_category.id not in ids

    async def test_list_jobs_filter_by_user_id(
            self, async_client: AsyncClient, test_job, job_other_user, customer_test_user
    ):
        response = await async_client.get(
            "/api/v1/jobs", params={"user_id": customer_test_user.id}
        )
        ids = [j["id"] for j in response.json()["data"]]
        assert test_job.id in ids
        assert job_other_user.id not in ids

    async def test_list_jobs_search_by_title(self, async_client: AsyncClient, job_with_title_plumber):
        response = await async_client.get("/api/v1/jobs", params={"search": "plumber"})
        ids = [j["id"] for j in response.json()["data"]]
        assert job_with_title_plumber.id in ids

    async def test_list_jobs_search_by_description(self, async_client: AsyncClient, job_with_desc_keyword):
        response = await async_client.get("/api/v1/jobs", params={"search": "urgent repair"})
        ids = [j["id"] for j in response.json()["data"]]
        assert job_with_desc_keyword.id in ids

    async def test_list_jobs_search_case_insensitive(self, async_client: AsyncClient, job_with_title_plumber):
        response = await async_client.get("/api/v1/jobs", params={"search": "PLUMBER"})
        ids = [j["id"] for j in response.json()["data"]]
        assert job_with_title_plumber.id in ids

    async def test_list_jobs_search_no_match_returns_empty(self, async_client: AsyncClient, test_job):
        response = await async_client.get("/api/v1/jobs", params={"search": "zzz_no_match_xyz"})
        assert response.json()["data"] == []

    async def test_list_jobs_filter_budget_min(
            self, async_client: AsyncClient, high_budget_job, low_budget_job
    ):
        response = await async_client.get("/api/v1/jobs", params={"budget_min": "500.00"})
        ids = [j["id"] for j in response.json()["data"]]
        assert high_budget_job.id in ids
        assert low_budget_job.id not in ids

    async def test_list_jobs_filter_budget_max(
            self, async_client: AsyncClient, high_budget_job, low_budget_job
    ):
        response = await async_client.get("/api/v1/jobs", params={"budget_max": "300.00"})
        ids = [j["id"] for j in response.json()["data"]]
        assert low_budget_job.id in ids
        assert high_budget_job.id not in ids

    async def test_list_jobs_combined_filters(
            self, async_client: AsyncClient, open_job, closed_job, test_trade_category
    ):
        response = await async_client.get(
            "/api/v1/jobs",
            params={"status": "open", "trade_category_id": test_trade_category.id}
        )
        ids = [j["id"] for j in response.json()["data"]]
        assert open_job.id in ids
        assert closed_job.id not in ids

    async def test_list_jobs_unauthenticated_succeeds(self, async_client: AsyncClient, test_job):
        response = await async_client.get("/api/v1/jobs")
        assert response.status_code == 200


class TestGetMyJobs:
    """GET /api/v1/jobs/my"""

    async def test_customer_can_list_own_jobs(
            self, async_client: AsyncClient, customer_auth_headers, customer_test_user, test_job
    ):
        response = await async_client.get("/api/v1/jobs/my", headers=customer_auth_headers)
        assert response.status_code == 200
        ids = [j["id"] for j in response.json()["data"]]
        assert test_job.id in ids

    async def test_only_returns_current_users_jobs(
            self, async_client: AsyncClient, customer_auth_headers, customer_test_user, test_job, job_other_user
    ):
        response = await async_client.get("/api/v1/jobs/my", headers=customer_auth_headers)
        ids = [j["id"] for j in response.json()["data"]]
        assert test_job.id in ids
        assert job_other_user.id not in ids

    async def test_worker_cannot_access(self, async_client: AsyncClient, worker_profile_auth_headers):
        response = await async_client.get("/api/v1/jobs/my", headers=worker_profile_auth_headers)
        assert response.status_code == 403

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/jobs/my")
        assert response.status_code == 401

    async def test_returns_empty_list_when_no_jobs(
            self, async_client: AsyncClient, customer_auth_headers
    ):
        response = await async_client.get("/api/v1/jobs/my", headers=customer_auth_headers)
        data = response.json()
        assert data["data"] == []
        assert data["total_count"] == 0

    async def test_excludes_deleted_jobs(
            self, async_client: AsyncClient, customer_auth_headers, test_job, deleted_job
    ):
        """deleted_job must belong to the same test_customer for this to be a meaningful test."""
        response = await async_client.get("/api/v1/jobs/my", headers=customer_auth_headers)
        ids = [j["id"] for j in response.json()["data"]]
        assert test_job.id in ids
        assert deleted_job.id not in ids

    async def test_pagination_page_size(
            self, async_client: AsyncClient, customer_auth_headers, many_jobs_same_customer
    ):
        response = await async_client.get(
            "/api/v1/jobs/my", params={"page_size": 3}, headers=customer_auth_headers
        )
        assert len(response.json()["data"]) == 3

    async def test_pagination_page_2_returns_different_jobs(
            self, async_client: AsyncClient, customer_auth_headers, many_jobs_same_customer
    ):
        page_1 = await async_client.get(
            "/api/v1/jobs/my", params={"page": 1, "page_size": 5}, headers=customer_auth_headers
        )
        page_2 = await async_client.get(
            "/api/v1/jobs/my", params={"page": 2, "page_size": 5}, headers=customer_auth_headers
        )
        page_1_ids = {j["id"] for j in page_1.json()["data"]}
        page_2_ids = {j["id"] for j in page_2.json()["data"]}
        assert not page_1_ids & page_2_ids

    async def test_has_more_true_when_additional_pages_exist(
            self, async_client: AsyncClient, customer_auth_headers, many_jobs_same_customer
    ):
        response = await async_client.get(
            "/api/v1/jobs/my", params={"page": 1, "page_size": 5}, headers=customer_auth_headers
        )
        assert response.json()["has_more"] is True

    async def test_has_more_false_on_last_page(
            self, async_client: AsyncClient, customer_auth_headers, many_jobs_same_customer
    ):
        # many_jobs_same_customer creates 10 jobs — page 2 of size 5 is the last page
        response = await async_client.get(
            "/api/v1/jobs/my", params={"page": 2, "page_size": 5}, headers=customer_auth_headers
        )
        assert response.json()["has_more"] is False

    async def test_total_count_reflects_all_owned_jobs_not_just_current_page(
            self, async_client: AsyncClient, customer_auth_headers, many_jobs_same_customer
    ):
        response = await async_client.get(
            "/api/v1/jobs/my", params={"page_size": 3}, headers=customer_auth_headers
        )
        assert response.json()["total_count"] == 10

    async def test_does_not_match_job_id_route(
            self, async_client: AsyncClient, customer_auth_headers
    ):
        """Regression test for route ordering — /jobs/my must not be
        swallowed by /jobs/{job_id} and attempt to parse 'my' as an int."""
        response = await async_client.get("/api/v1/jobs/my", headers=customer_auth_headers)
        assert response.status_code != 422
