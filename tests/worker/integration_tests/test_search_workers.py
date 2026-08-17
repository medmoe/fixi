from httpx import AsyncClient


class TestSearchWorkers:
    """GET /api/v1/worker-profile/search"""

    def _make_params(self, **kwargs) -> dict:
        """Build query params — only include explicitly passed filters."""
        return {k: v for k, v in kwargs.items() if v is not None}

    # ------------------------------------------------------------------ #
    #  Basic behaviour                                                     #
    # ------------------------------------------------------------------ #

    async def test_search_workers_returns_200(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/worker-profile/search")
        assert response.status_code == 200

    async def test_search_workers_unauthenticated_succeeds(self, async_client: AsyncClient):
        """Public endpoint — no token required."""
        response = await async_client.get("/api/v1/worker-profile/search")
        assert response.status_code == 200

    async def test_search_workers_response_shape(
            self, async_client: AsyncClient, test_worker_profile
    ):
        response = await async_client.get("/api/v1/worker-profile/search")
        data = response.json()
        assert "data" in data
        assert "total_count" in data
        assert isinstance(data["data"], list)

    async def test_search_workers_no_filters_returns_all(
            self, async_client: AsyncClient, many_worker_profiles
    ):
        response = await async_client.get("/api/v1/worker-profile/search")
        data = response.json()
        assert data["total_count"] == len(many_worker_profiles)

    async def test_search_workers_returns_correct_schema(
            self, async_client: AsyncClient, test_worker_profile
    ):
        """Each item must match WorkerProfileWithTradesRead shape."""
        response = await async_client.get("/api/v1/worker-profile/search")
        worker = response.json()["data"][0]
        assert "id" in worker
        assert "user_id" in worker
        assert "bio" in worker
        assert "hourly_rate" in worker
        assert "years_of_experience" in worker
        assert "service_radius_km" in worker
        assert "is_available" in worker
        assert "is_verified" in worker
        assert "trade_categories" in worker
        assert isinstance(worker["trade_categories"], list)

    async def test_search_workers_empty_db_returns_empty_list(
            self, async_client: AsyncClient
    ):
        response = await async_client.get("/api/v1/worker-profile/search")
        data = response.json()
        assert data["data"] == []
        assert data["total_count"] == 0

    # ------------------------------------------------------------------ #
    #  trade_category_id filter                                            #
    # ------------------------------------------------------------------ #

    async def test_filter_trade_category_returns_matching_workers(
            self,
            async_client: AsyncClient,
            worker_with_plumbing,
            worker_with_electrical,
            test_trade_category_plumbing,
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(trade_category_id=test_trade_category_plumbing.id),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_with_plumbing.id in ids
        assert worker_with_electrical.id not in ids

    async def test_filter_trade_category_no_match_returns_empty(
            self, async_client: AsyncClient, test_worker_profile
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(trade_category_id=99999),
        )
        assert response.json()["data"] == []

    async def test_filter_trade_category_total_count_is_accurate(
            self,
            async_client: AsyncClient,
            worker_with_plumbing,
            worker_with_electrical,
            test_trade_category_plumbing,
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(trade_category_id=test_trade_category_plumbing.id),
        )
        assert response.json()["total_count"] == 1

    # ------------------------------------------------------------------ #
    #  Hourly rate range filters                                           #
    # ------------------------------------------------------------------ #

    async def test_filter_min_hourly_rate_excludes_lower_rates(
            self,
            async_client: AsyncClient,
            worker_low_rate,  # hourly_rate=20.00
            worker_high_rate,  # hourly_rate=150.00
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(min_hourly_rate="50.00"),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_high_rate.id in ids
        assert worker_low_rate.id not in ids

    async def test_filter_max_hourly_rate_excludes_higher_rates(
            self,
            async_client: AsyncClient,
            worker_low_rate,
            worker_high_rate,
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(max_hourly_rate="50.00"),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_low_rate.id in ids
        assert worker_high_rate.id not in ids

    async def test_filter_hourly_rate_range_both_bounds(
            self,
            async_client: AsyncClient,
            worker_low_rate,  # 20.00
            worker_mid_rate,  # 75.00
            worker_high_rate,  # 150.00
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(min_hourly_rate="50.00", max_hourly_rate="100.00"),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_mid_rate.id in ids
        assert worker_low_rate.id not in ids
        assert worker_high_rate.id not in ids

    async def test_filter_hourly_rate_exact_boundary_is_inclusive(
            self,
            async_client: AsyncClient,
            worker_mid_rate,  # hourly_rate=75.00
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(min_hourly_rate="75.00", max_hourly_rate="75.00"),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_mid_rate.id in ids

    # ------------------------------------------------------------------ #
    #  Years of experience range filters                                   #
    # ------------------------------------------------------------------ #

    async def test_filter_min_years_of_experience_excludes_less_experienced(
            self,
            async_client: AsyncClient,
            worker_junior,  # years_of_experience=1
            worker_senior,  # years_of_experience=10
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(min_years_of_experience=5),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_senior.id in ids
        assert worker_junior.id not in ids

    async def test_filter_max_years_of_experience_excludes_more_experienced(
            self,
            async_client: AsyncClient,
            worker_junior,
            worker_senior,
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(max_years_of_experience=5),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_junior.id in ids
        assert worker_senior.id not in ids

    async def test_filter_years_of_experience_range_both_bounds(
            self,
            async_client: AsyncClient,
            worker_junior,  # 1
            worker_mid,  # 5
            worker_senior,  # 10
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(min_years_of_experience=3, max_years_of_experience=7),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_mid.id in ids
        assert worker_junior.id not in ids
        assert worker_senior.id not in ids

    async def test_filter_years_of_experience_exact_boundary_is_inclusive(
            self,
            async_client: AsyncClient,
            worker_mid,  # years_of_experience=5
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(min_years_of_experience=5, max_years_of_experience=5),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_mid.id in ids

    # ------------------------------------------------------------------ #
    #  service_radius_km filter                                            #
    # ------------------------------------------------------------------ #

    async def test_filter_service_radius_returns_workers_with_sufficient_radius(
            self,
            async_client: AsyncClient,
            worker_small_radius,  # service_radius_km=10
            worker_large_radius,  # service_radius_km=100
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(service_radius_km=50),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_large_radius.id in ids
        assert worker_small_radius.id not in ids

    async def test_filter_service_radius_exact_match_is_inclusive(
            self,
            async_client: AsyncClient,
            worker_small_radius,  # service_radius_km=10
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(service_radius_km=10),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_small_radius.id in ids

    # ------------------------------------------------------------------ #
    #  is_available filter                                                 #
    # ------------------------------------------------------------------ #

    async def test_filter_is_available_true_returns_only_available(
            self,
            async_client: AsyncClient,
            worker_available,
            worker_unavailable,
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(is_available=True),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_available.id in ids
        assert worker_unavailable.id not in ids

    async def test_filter_is_available_false_returns_only_unavailable(
            self,
            async_client: AsyncClient,
            worker_available,
            worker_unavailable,
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(is_available=False),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_unavailable.id in ids
        assert worker_available.id not in ids

    async def test_no_availability_filter_returns_both(
            self,
            async_client: AsyncClient,
            worker_available,
            worker_unavailable,
    ):
        response = await async_client.get("/api/v1/worker-profile/search")
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_available.id in ids
        assert worker_unavailable.id in ids

    # ------------------------------------------------------------------ #
    #  is_verified filter                                                  #
    # ------------------------------------------------------------------ #

    async def test_filter_is_verified_true_returns_only_verified(
            self,
            async_client: AsyncClient,
            worker_verified,
            worker_unverified,
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(is_verified=True),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_verified.id in ids
        assert worker_unverified.id not in ids

    async def test_filter_is_verified_false_returns_only_unverified(
            self,
            async_client: AsyncClient,
            worker_verified,
            worker_unverified,
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(is_verified=False),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_unverified.id in ids
        assert worker_verified.id not in ids

    async def test_no_verified_filter_returns_both(
            self,
            async_client: AsyncClient,
            worker_verified,
            worker_unverified,
    ):
        response = await async_client.get("/api/v1/worker-profile/search")
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_verified.id in ids
        assert worker_unverified.id in ids

    # ------------------------------------------------------------------ #
    #  Pagination                                                          #
    # ------------------------------------------------------------------ #

    async def test_pagination_default_limit(
            self, async_client: AsyncClient, many_worker_profiles
    ):
        """Default limit should cap results — assuming default is 20."""
        response = await async_client.get("/api/v1/worker-profile/search")
        assert len(response.json()["data"]) <= 20

    async def test_pagination_custom_limit(
            self, async_client: AsyncClient, many_worker_profiles
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search", params={"limit": 3}
        )
        assert len(response.json()["data"]) == 3

    async def test_pagination_offset_skips_records(
            self, async_client: AsyncClient, many_worker_profiles
    ):
        all_response = await async_client.get(
            "/api/v1/worker-profile/search", params={"limit": 10, "offset": 0}
        )
        offset_response = await async_client.get(
            "/api/v1/worker-profile/search", params={"limit": 10, "offset": 2}
        )
        all_ids = [w["id"] for w in all_response.json()["data"]]
        offset_ids = [w["id"] for w in offset_response.json()["data"]]
        assert all_ids[0] not in offset_ids
        assert all_ids[1] not in offset_ids

    async def test_pagination_offset_beyond_total_returns_empty(
            self, async_client: AsyncClient, many_worker_profiles
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search", params={"limit": 10, "offset": 9999}
        )
        assert response.json()["data"] == []

    async def test_pagination_total_count_reflects_filters(
            self,
            async_client: AsyncClient,
            worker_available,
            worker_unavailable,
    ):
        """total_count must reflect the filtered set, not all workers."""
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(is_available=True),
        )
        assert response.json()["total_count"] == 1

    async def test_pagination_total_count_unaffected_by_limit(
            self,
            async_client: AsyncClient,
            many_worker_profiles,
    ):
        """total_count should reflect all matches, not just the current page."""
        response = await async_client.get(
            "/api/v1/worker-profile/search", params={"limit": 3, "offset": 0}
        )
        data = response.json()
        assert data["total_count"] == len(many_worker_profiles)
        assert len(data["data"]) == 3

    # ------------------------------------------------------------------ #
    #  Combined filters                                                    #
    # ------------------------------------------------------------------ #

    async def test_combined_trade_and_availability(
            self,
            async_client: AsyncClient,
            worker_with_plumbing,  # available=True
            worker_with_plumbing_unavailable,  # available=False
            test_trade_category_plumbing,
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(
                trade_category_id=test_trade_category_plumbing.id,
                is_available=True,
            ),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_with_plumbing.id in ids
        assert worker_with_plumbing_unavailable.id not in ids

    async def test_combined_rate_and_experience(
            self,
            async_client: AsyncClient,
            worker_senior_high_rate,  # years=10, rate=150.00
            worker_junior_low_rate,  # years=1,  rate=20.00
            worker_senior_low_rate,  # years=10, rate=20.00
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(
                min_years_of_experience=5,
                min_hourly_rate="100.00",
            ),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_senior_high_rate.id in ids
        assert worker_junior_low_rate.id not in ids
        assert worker_senior_low_rate.id not in ids

    async def test_combined_verified_and_radius(
            self,
            async_client: AsyncClient,
            worker_verified_large_radius,  # verified=True,  radius=100
            worker_verified_small_radius,  # verified=True,  radius=10
            worker_unverified_large_radius,  # verified=False, radius=100
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(is_verified=True, service_radius_km=50),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_verified_large_radius.id in ids
        assert worker_verified_small_radius.id not in ids
        assert worker_unverified_large_radius.id not in ids

    async def test_all_filters_combined(
            self,
            async_client: AsyncClient,
            perfect_match_worker,  # matches all filters below
            partial_match_worker,  # fails at least one filter
            test_trade_category_plumbing,
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(
                trade_category_id=test_trade_category_plumbing.id,
                min_hourly_rate="40.00",
                max_hourly_rate="120.00",
                min_years_of_experience=3,
                max_years_of_experience=8,
                service_radius_km=25,
                is_available=True,
                is_verified=True,
            ),
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert perfect_match_worker.id in ids
        assert partial_match_worker.id not in ids


class TestSearchWorkersGeo:
    """GET /api/v1/worker-profile/search — geo filtering via latitude/longitude/radius_km"""

    def _make_params(self, **kwargs) -> dict:
        return {k: v for k, v in kwargs.items() if v is not None}

    # ------------------------------------------------------------------ #
    #  Validation                                                          #
    # ------------------------------------------------------------------ #

    async def test_only_latitude_provided_returns_422(self, async_client: AsyncClient):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(latitude=36.7538),  # Algiers latitude
        )
        assert response.status_code == 422

    async def test_only_longitude_provided_returns_422(self, async_client: AsyncClient):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params=self._make_params(longitude=3.0588),  # Algiers longitude
        )
        assert response.status_code == 422

    async def test_no_lat_lng_falls_back_to_non_geo_search(
            self, async_client: AsyncClient, worker_in_algiers, worker_in_oran
    ):
        """Without coordinates, geo filtering is skipped — all matching workers returned."""
        response = await async_client.get("/api/v1/worker-profile/search")
        assert response.status_code == 200
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_in_algiers.id in ids
        assert worker_in_oran.id in ids

    async def test_latitude_out_of_range_returns_422(self, async_client: AsyncClient):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={"latitude": 95.0, "longitude": 3.0588},
        )
        assert response.status_code == 422

    async def test_longitude_out_of_range_returns_422(self, async_client: AsyncClient):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={"latitude": 36.7538, "longitude": 200.0},
        )
        assert response.status_code == 422

    # ------------------------------------------------------------------ #
    #  Geo filtering                                                       #
    # ------------------------------------------------------------------ #

    async def test_worker_within_radius_is_included(
            self, async_client: AsyncClient, worker_in_algiers_covers_customer
    ):
        """
        worker_in_algiers_covers_customer: located in central Algiers,
        service_radius_km=20 — customer point is ~5km away, well within range.
        """
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={"latitude": 36.7600, "longitude": 3.0500},  # nearby point in Algiers
        )
        assert response.status_code == 200
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_in_algiers_covers_customer.id in ids

    async def test_worker_outside_radius_is_excluded(
            self, async_client: AsyncClient, worker_in_oran_small_radius
    ):
        """
        worker_in_oran_small_radius: located in Oran, service_radius_km=10.
        Oran and Algiers are ~350km apart — far outside a 10km radius.
        """
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={"latitude": 36.7538, "longitude": 3.0588},  # Algiers
        )
        assert response.status_code == 200
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_in_oran_small_radius.id not in ids

    async def test_worker_with_no_location_excluded_from_geo_search(
            self, async_client: AsyncClient, worker_no_location
    ):
        """A worker whose User.location is NULL must never match a geo search."""
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={"latitude": 36.7538, "longitude": 3.0588},
        )
        assert response.status_code == 200
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_no_location.id not in ids

    async def test_worker_with_no_location_included_in_non_geo_search(
            self, async_client: AsyncClient, worker_no_location
    ):
        """The same worker IS visible when no lat/lng filter is applied."""
        response = await async_client.get("/api/v1/worker-profile/search")
        assert response.status_code == 200
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_no_location.id in ids

    async def test_worker_exactly_at_radius_boundary_is_included(
            self, async_client: AsyncClient, worker_at_exact_boundary
    ):
        """
        worker_at_exact_boundary: service_radius_km set so the customer point
        sits exactly on the boundary of ST_DWithin's <= comparison.
        """
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={"latitude": 36.7538, "longitude": 3.1088},  # ~5km east of worker's location
        )
        assert response.status_code == 200
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_at_exact_boundary.id in ids

    async def test_geo_search_combined_with_other_filters(
            self,
            async_client: AsyncClient,
            worker_in_algiers_covers_customer,  # matches geo + is_verified=True
            worker_in_algiers_unverified,  # matches geo but is_verified=False
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={
                "latitude": 36.7600,
                "longitude": 3.0500,
                "is_verified": True,
            },
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert worker_in_algiers_covers_customer.id in ids
        assert worker_in_algiers_unverified.id not in ids

    async def test_geo_search_total_count_reflects_geo_filter(
            self,
            async_client: AsyncClient,
            worker_in_algiers_covers_customer,
            worker_in_oran_small_radius,
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={"latitude": 36.7600, "longitude": 3.0500},
        )
        assert response.json()["total_count"] == 1


class TestSearchWorkersRanking:
    """GET /api/v1/worker-profile/search — composite ranking (distance + availability + verification)"""

    def _make_params(self, **kwargs) -> dict:
        return {k: v for k, v in kwargs.items() if v is not None}

    # ------------------------------------------------------------------ #
    #  Default sort — distance ASC                                        #
    # ------------------------------------------------------------------ #

    async def test_default_sort_is_distance_ascending(
        self,
        async_client: AsyncClient,
        worker_near_customer,   # ~2km away
        worker_mid_distance,    # ~8km away
        worker_far_distance,    # ~15km away
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={"latitude": 36.7538, "longitude": 3.0588},
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert ids.index(worker_near_customer.id) < ids.index(worker_mid_distance.id)
        assert ids.index(worker_mid_distance.id) < ids.index(worker_far_distance.id)

    async def test_explicit_sort_by_distance_matches_default(
        self,
        async_client: AsyncClient,
        worker_near_customer,
        worker_far_distance,
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={"latitude": 36.7538, "longitude": 3.0588, "sort_by": "distance"},
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert ids.index(worker_near_customer.id) < ids.index(worker_far_distance.id)

    # ------------------------------------------------------------------ #
    #  Availability boost                                                  #
    # ------------------------------------------------------------------ #

    async def test_available_worker_ranked_above_unavailable_at_similar_distance(
        self,
        async_client: AsyncClient,
        worker_available_near,      # available, ~3km away
        worker_unavailable_nearer,  # unavailable, ~1km away (closer, but should rank lower)
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={"latitude": 36.7538, "longitude": 3.0588},
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert ids.index(worker_available_near.id) < ids.index(worker_unavailable_nearer.id)

    # ------------------------------------------------------------------ #
    #  Verification boost                                                  #
    # ------------------------------------------------------------------ #

    async def test_verified_worker_ranked_above_unverified_within_same_availability(
        self,
        async_client: AsyncClient,
        worker_verified_available,     # available + verified
        worker_unverified_available,   # available + unverified, closer distance
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={"latitude": 36.7538, "longitude": 3.0588},
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert ids.index(worker_verified_available.id) < ids.index(worker_unverified_available.id)

    async def test_availability_boost_outranks_verification_boost(
        self,
        async_client: AsyncClient,
        worker_available_unverified,   # available, NOT verified
        worker_unavailable_verified,   # unavailable, verified
    ):
        """Availability is the primary tier — an available-but-unverified
        worker must still rank above an unavailable-but-verified one."""
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={"latitude": 36.7538, "longitude": 3.0588},
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert ids.index(worker_available_unverified.id) < ids.index(worker_unavailable_verified.id)

    # ------------------------------------------------------------------ #
    #  sort_by=hourly_rate                                                 #
    # ------------------------------------------------------------------ #

    async def test_sort_by_hourly_rate_ascending(
        self,
        async_client: AsyncClient,
        worker_low_rate,    # 20.00
        worker_mid_rate,    # 75.00
        worker_high_rate,   # 150.00
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={"sort_by": "hourly_rate"},
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert ids.index(worker_low_rate.id) < ids.index(worker_mid_rate.id)
        assert ids.index(worker_mid_rate.id) < ids.index(worker_high_rate.id)

    async def test_sort_by_hourly_rate_respects_availability_boost(
        self,
        async_client: AsyncClient,
        worker_available_high_rate,     # available, 150.00
        worker_unavailable_low_rate,    # unavailable, 20.00
    ):
        """Even sorting by hourly_rate, availability remains the primary tier."""
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={"sort_by": "hourly_rate"},
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert ids.index(worker_available_high_rate.id) < ids.index(worker_unavailable_low_rate.id)

    # ------------------------------------------------------------------ #
    #  sort_by=experience                                                  #
    # ------------------------------------------------------------------ #

    async def test_sort_by_experience_descending(
        self,
        async_client: AsyncClient,
        worker_junior,   # 1 year
        worker_mid,      # 5 years
        worker_senior,   # 10 years
    ):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={"sort_by": "experience"},
        )
        ids = [w["id"] for w in response.json()["data"]]
        assert ids.index(worker_senior.id) < ids.index(worker_mid.id)
        assert ids.index(worker_mid.id) < ids.index(worker_junior.id)

    # ------------------------------------------------------------------ #
    #  sort_by=distance without coordinates                                #
    # ------------------------------------------------------------------ #

    async def test_sort_by_distance_without_coordinates_falls_back_gracefully(
        self, async_client: AsyncClient, worker_available, worker_unavailable
    ):
        """No lat/lng provided — distance can't be computed, but the request
        must still succeed rather than error, falling back to a deterministic order."""
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={"sort_by": "distance"},
        )
        assert response.status_code == 200
        ids = [w["id"] for w in response.json()["data"]]
        # availability boost still applies even without distance
        assert ids.index(worker_available.id) < ids.index(worker_unavailable.id)

    # ------------------------------------------------------------------ #
    #  Invalid sort_by                                                     #
    # ------------------------------------------------------------------ #

    async def test_invalid_sort_by_returns_422(self, async_client: AsyncClient):
        response = await async_client.get(
            "/api/v1/worker-profile/search",
            params={"sort_by": "popularity"},  # not a valid WorkerSortBy value
        )
        assert response.status_code == 422

    # ------------------------------------------------------------------ #
    #  Combined ranking with pagination                                    #
    # ------------------------------------------------------------------ #

    async def test_ranking_order_stable_across_pages(
        self, async_client: AsyncClient, many_ranked_workers
    ):
        """The same worker must never appear on two different pages, and the
        overall order (by id, as final tiebreaker) must be consistent."""
        page_1 = await async_client.get(
            "/api/v1/worker-profile/search", params={"limit": 5, "offset": 0}
        )
        page_2 = await async_client.get(
            "/api/v1/worker-profile/search", params={"limit": 5, "offset": 5}
        )
        page_1_ids = [w["id"] for w in page_1.json()["data"]]
        page_2_ids = [w["id"] for w in page_2.json()["data"]]
        assert not set(page_1_ids) & set(page_2_ids)
