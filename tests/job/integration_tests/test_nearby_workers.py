from httpx import AsyncClient


class TestGetNearbyWorkersEndpoint:
    """GET /jobs/{job_id}/nearby-workers"""

    # ------------------------------------------------------------------ #
    #  Auth / ownership                                                    #
    # ------------------------------------------------------------------ #

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient, test_job):
        response = await async_client.get(f"/api/v1/jobs/{test_job.id}/nearby-workers")
        assert response.status_code == 401

    async def test_non_owner_forbidden(
            self, async_client: AsyncClient, other_customer_auth_headers, test_job
    ):
        response = await async_client.get(
            f"/api/v1/jobs/{test_job.id}/nearby-workers", headers=other_customer_auth_headers
        )
        assert response.status_code == 403

    async def test_owner_can_access(
            self, async_client: AsyncClient, customer_auth_headers, test_job
    ):
        response = await async_client.get(
            f"/api/v1/jobs/{test_job.id}/nearby-workers", headers=customer_auth_headers
        )
        assert response.status_code == 200

    async def test_nonexistent_job_returns_404(
            self, async_client: AsyncClient, customer_auth_headers
    ):
        response = await async_client.get(
            "/api/v1/jobs/999999/nearby-workers", headers=customer_auth_headers
        )
        assert response.status_code == 404

    # ------------------------------------------------------------------ #
    #  Job has no location                                                 #
    # ------------------------------------------------------------------ #

    async def test_job_with_no_location_returns_400(
            self, async_client: AsyncClient, customer_auth_headers, job_with_no_location
    ):
        response = await async_client.get(
            f"/api/v1/jobs/{job_with_no_location.id}/nearby-workers", headers=customer_auth_headers
        )
        assert response.status_code == 400

    # ------------------------------------------------------------------ #
    #  Distance filtering                                                  #
    # ------------------------------------------------------------------ #

    async def test_worker_within_radius_is_included(
            self,
            async_client: AsyncClient,
            customer_auth_headers,
            job_in_algiers_no_category,
            worker_covers_job_location,
    ):
        response = await async_client.get(
            f"/api/v1/jobs/{job_in_algiers_no_category.id}/nearby-workers", headers=customer_auth_headers
        )
        assert response.status_code == 200
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_covers_job_location.id in ids

    async def test_worker_outside_radius_is_excluded(
            self, async_client: AsyncClient, customer_auth_headers, job_in_algiers_no_category, worker_far_away_small_radius
    ):
        response = await async_client.get(
            f"/api/v1/jobs/{job_in_algiers_no_category.id}/nearby-workers", headers=customer_auth_headers
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_far_away_small_radius.id not in ids

    async def test_worker_with_no_location_excluded(
            self, async_client: AsyncClient, customer_auth_headers, job_in_algiers_no_category, worker_no_location
    ):
        response = await async_client.get(
            f"/api/v1/jobs/{job_in_algiers_no_category.id}/nearby-workers", headers=customer_auth_headers
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_no_location.id not in ids

    async def test_results_sorted_by_distance_ascending(
            self,
            async_client: AsyncClient,
            customer_auth_headers,
            job_in_algiers_no_category,
            worker_near_job,
            worker_mid_distance_from_job,
    ):
        response = await async_client.get(
            f"/api/v1/jobs/{job_in_algiers_no_category.id}/nearby-workers", headers=customer_auth_headers
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert ids.index(worker_near_job.id) < ids.index(worker_mid_distance_from_job.id)
        distances = [w["distance_km"] for w in response.json()["data"]]
        assert all(d is not None for d in distances)
        assert distances == sorted(distances)

    # ------------------------------------------------------------------ #
    #  Trade category filtering                                            #
    # ------------------------------------------------------------------ #

    async def test_filters_by_job_trade_category_automatically(
            self,
            async_client: AsyncClient,
            customer_auth_headers,
            job_in_algiers_plumbing,
            worker_plumbing_covers_job,
            worker_electrical_covers_job,
    ):
        response = await async_client.get(
            f"/api/v1/jobs/{job_in_algiers_plumbing.id}/nearby-workers", headers=customer_auth_headers
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_plumbing_covers_job.id in ids
        assert worker_electrical_covers_job.id not in ids

    async def test_job_with_no_trade_category_returns_all_nearby_workers(
            self,
            async_client: AsyncClient,
            customer_auth_headers,
            job_in_algiers_no_category,
            worker_plumbing_covers_job,
            worker_electrical_covers_job,
    ):
        response = await async_client.get(
            f"/api/v1/jobs/{job_in_algiers_no_category.id}/nearby-workers", headers=customer_auth_headers
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_plumbing_covers_job.id in ids
        assert worker_electrical_covers_job.id in ids

    # ------------------------------------------------------------------ #
    #  Availability                                                        #
    # ------------------------------------------------------------------ #

    async def test_unavailable_worker_excluded(
            self, async_client: AsyncClient, customer_auth_headers, job_in_algiers_no_category, worker_covers_job_location_unavailable
    ):
        response = await async_client.get(
            f"/api/v1/jobs/{job_in_algiers_no_category.id}/nearby-workers", headers=customer_auth_headers
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_covers_job_location_unavailable.id not in ids

    # ------------------------------------------------------------------ #
    #  Empty results                                                       #
    # ------------------------------------------------------------------ #

    async def test_no_nearby_workers_returns_empty_list(
            self, async_client: AsyncClient, customer_auth_headers, job_in_algiers_no_category
    ):
        response = await async_client.get(
            f"/api/v1/jobs/{job_in_algiers_no_category.id}/nearby-workers", headers=customer_auth_headers
        )
        data = response.json()
        assert data["data"] == []
        assert data["total_count"] == 0
