from src.app.crud.crud_jobs import crud_jobs
from src.app.models import JobStatus
from src.app.schemas.job import JobRead, JobFilter


class TestGetMultiJobs:

    def _make_filter(self, **kwargs) -> JobFilter:
        defaults = {
            "status": None,
            "trade_category_id": None,
            "user_id": None,
            "budget_min": None,
            "budget_max": None,
            "search": None,
        }
        return JobFilter(**{**defaults, **kwargs})

    # ------------------------------------------------------------------ #
    #  Default behaviour                                                   #
    # ------------------------------------------------------------------ #

    async def test_returns_only_non_deleted_jobs(self, async_session, test_job, deleted_job):
        """Deleted jobs must never appear in results regardless of other filters."""
        filters = self._make_filter()
        result = await crud_jobs.get_multi_jobs(async_session, filters)
        ids = [j.id for j in result]
        assert test_job.id in ids
        assert deleted_job.id not in ids

    async def test_returns_empty_list_when_no_jobs(self, async_session):
        """Fresh session with no seeded jobs → empty list."""
        filters = self._make_filter()
        result = await crud_jobs.get_multi_jobs(async_session, filters)
        assert result == []

    async def test_returns_list_of_job_read_instances(self, async_session, test_job):
        filters = self._make_filter()
        result = await crud_jobs.get_multi_jobs(async_session, filters)
        assert all(isinstance(j, JobRead) for j in result)

    # ------------------------------------------------------------------ #
    #  Status filter                                                       #
    # ------------------------------------------------------------------ #

    async def test_status_filter_open(self, async_session, open_job, closed_job):
        filters = self._make_filter(status=JobStatus.OPEN)
        result = await crud_jobs.get_multi_jobs(async_session, filters)

        ids = [j.id for j in result]
        assert open_job.id in ids
        assert closed_job.id not in ids

    async def test_status_filter_completed(self, async_session, open_job, closed_job):
        filters = self._make_filter(status=JobStatus.COMPLETED)
        result = await crud_jobs.get_multi_jobs(async_session, filters)

        ids = [j.id for j in result]
        assert closed_job.id in ids
        assert open_job.id not in ids

    async def test_no_status_filter_returns_all_statuses(self, async_session, open_job, closed_job):
        filters = self._make_filter()
        result = await crud_jobs.get_multi_jobs(async_session, filters)

        ids = [j.id for j in result]
        assert open_job.id in ids
        assert closed_job.id in ids

    # ------------------------------------------------------------------ #
    #  Trade category filter                                               #
    # ------------------------------------------------------------------ #

    async def test_trade_category_filter_returns_matching_jobs(
            self, async_session, test_job, job_with_different_trade_category
    ):
        filters = self._make_filter(trade_category_id=test_job.trade_category_id)
        result = await crud_jobs.get_multi_jobs(async_session, filters)

        ids = [j.id for j in result]
        assert test_job.id in ids
        assert job_with_different_trade_category.id not in ids

    async def test_trade_category_filter_no_match_returns_empty(self, async_session, test_job):
        filters = self._make_filter(trade_category_id=99999)
        result = await crud_jobs.get_multi_jobs(async_session, filters)
        assert result == []

    # ------------------------------------------------------------------ #
    #  User filter                                                         #
    # ------------------------------------------------------------------ #

    async def test_user_id_filter_returns_only_that_users_jobs(
            self, async_session, test_job, customer_test_user, job_other_user
    ):
        filters = self._make_filter(user_id=customer_test_user.id)
        result = await crud_jobs.get_multi_jobs(async_session, filters)

        ids = [j.id for j in result]
        assert test_job.id in ids
        assert job_other_user.id not in ids

    async def test_user_id_filter_no_match_returns_empty(self, async_session):
        filters = self._make_filter(user_id=99999)
        result = await crud_jobs.get_multi_jobs(async_session, filters)
        assert result == []

    # ------------------------------------------------------------------ #
    #  Budget range filters                                                #
    # ------------------------------------------------------------------ #

    async def test_budget_min_excludes_jobs_below_range(
            self, async_session, high_budget_job, low_budget_job
    ):
        # budget_min=500 → only jobs whose budget_max >= 500 qualify
        filters = self._make_filter(budget_min=500)
        result = await crud_jobs.get_multi_jobs(async_session, filters)

        ids = [j.id for j in result]
        assert high_budget_job.id in ids
        assert low_budget_job.id not in ids

    async def test_budget_max_excludes_jobs_above_range(
            self, async_session, high_budget_job, low_budget_job
    ):
        # budget_max=300 → only jobs whose budget_min <= 300 qualify
        filters = self._make_filter(budget_max=300)
        result = await crud_jobs.get_multi_jobs(async_session, filters)

        ids = [j.id for j in result]
        assert low_budget_job.id in ids
        assert high_budget_job.id not in ids

    async def test_budget_range_both_bounds(
            self, async_session, high_budget_job, low_budget_job, mid_budget_job
    ):
        # only jobs that overlap [400, 600]
        filters = self._make_filter(budget_min=400, budget_max=600)
        result = await crud_jobs.get_multi_jobs(async_session, filters)

        ids = [j.id for j in result]
        assert mid_budget_job.id in ids
        assert low_budget_job.id not in ids
        assert high_budget_job.id not in ids

    async def test_budget_range_exact_boundary_is_inclusive(
            self, async_session, exact_boundary_job
    ):
        # job has budget_min=500, budget_max=500 → filter min=500,max=500 must include it
        filters = self._make_filter(budget_min=500, budget_max=500)
        result = await crud_jobs.get_multi_jobs(async_session, filters)

        ids = [j.id for j in result]
        assert exact_boundary_job.id in ids

    # ------------------------------------------------------------------ #
    #  Search (ILIKE raw SQL branch)                                       #
    # ------------------------------------------------------------------ #

    async def test_search_matches_title(self, async_session, job_with_title_plumber):
        filters = self._make_filter(search="plumber")
        result = await crud_jobs.get_multi_jobs(async_session, filters)

        ids = [j.id for j in result]
        assert job_with_title_plumber.id in ids

    async def test_search_matches_description(self, async_session, job_with_desc_keyword):
        filters = self._make_filter(search="urgent repair")
        result = await crud_jobs.get_multi_jobs(async_session, filters)

        ids = [j.id for j in result]
        assert job_with_desc_keyword.id in ids

    async def test_search_is_case_insensitive(self, async_session, job_with_title_plumber):
        for term in ("PLUMBER", "Plumber", "pLuMbEr"):
            filters = self._make_filter(search=term)
            result = await crud_jobs.get_multi_jobs(async_session, filters)
            ids = [j.id for j in result]
            assert job_with_title_plumber.id in ids, f"Failed for search term: {term!r}"

    async def test_search_excludes_deleted_jobs(self, async_session, deleted_job_with_keyword):
        filters = self._make_filter(search="deleted_keyword")
        result = await crud_jobs.get_multi_jobs(async_session, filters)

        ids = [j.id for j in result]
        assert deleted_job_with_keyword.id not in ids

    async def test_search_no_match_returns_empty(self, async_session, test_job):
        filters = self._make_filter(search="zzz_no_match_xyz_123")
        result = await crud_jobs.get_multi_jobs(async_session, filters)
        assert result == []

    async def test_search_partial_match(self, async_session, job_with_title_plumber):
        filters = self._make_filter(search="plumb")
        result = await crud_jobs.get_multi_jobs(async_session, filters)

        ids = [j.id for j in result]
        assert job_with_title_plumber.id in ids

    async def test_search_returns_job_read_instances(self, async_session, job_with_title_plumber):
        filters = self._make_filter(search="plumber")
        result = await crud_jobs.get_multi_jobs(async_session, filters)
        assert all(isinstance(j, JobRead) for j in result)

    # ------------------------------------------------------------------ #
    #  Pagination                                                          #
    # ------------------------------------------------------------------ #

    async def test_limit_restricts_result_count(self, async_session, many_jobs):
        # many_jobs fixture creates 10 jobs
        filters = self._make_filter()
        result = await crud_jobs.get_multi_jobs(async_session, filters, limit=3)
        assert len(result) == 3

    async def test_offset_skips_records(self, async_session, many_jobs):
        filters = self._make_filter()
        all_results = await crud_jobs.get_multi_jobs(async_session, filters, limit=60)
        offset_results = await crud_jobs.get_multi_jobs(async_session, filters, offset=2, limit=60)

        assert len(offset_results) == len(all_results) - 2
        assert all_results[0].id not in [j.id for j in offset_results]
        assert all_results[1].id not in [j.id for j in offset_results]

    async def test_offset_beyond_total_returns_empty(self, async_session, many_jobs):
        filters = self._make_filter()
        result = await crud_jobs.get_multi_jobs(async_session, filters, offset=9999)
        assert result == []

    async def test_search_limit_restricts_result_count(self, async_session, many_plumber_jobs):
        # many_plumber_jobs fixture creates 10 jobs with "plumber" in title
        filters = self._make_filter(search="plumber")
        result = await crud_jobs.get_multi_jobs(async_session, filters, limit=3)
        assert len(result) == 3

    async def test_search_offset_skips_records(self, async_session, many_plumber_jobs):
        filters = self._make_filter(search="plumber")
        all_results = await crud_jobs.get_multi_jobs(async_session, filters, limit=30)
        offset_results = await crud_jobs.get_multi_jobs(async_session, filters, offset=2, limit=30)

        assert len(offset_results) == len(all_results) - 2

    # ------------------------------------------------------------------ #
    #  Combined filters                                                    #
    # ------------------------------------------------------------------ #

    async def test_status_and_user_combined(
            self, async_session, customer_test_user, open_job, closed_job, job_other_user
    ):
        # open_job and closed_job both belong to test_user
        filters = self._make_filter(status=JobStatus.OPEN, user_id=customer_test_user.id)
        result = await crud_jobs.get_multi_jobs(async_session, filters)

        ids = [j.id for j in result]
        assert open_job.id in ids
        assert closed_job.id not in ids
        assert job_other_user.id not in ids

    async def test_trade_category_and_budget_combined(
            self, async_session, test_trade_category, matching_job, non_matching_job
    ):
        # matching_job: trade_category=test_trade_category, budget_min=100, budget_max=800
        # non_matching_job: same trade_category but budget range [1000, 2000]
        filters = self._make_filter(
            trade_category_id=test_trade_category.id,
            budget_max=500,
        )
        result = await crud_jobs.get_multi_jobs(async_session, filters)

        ids = [j.id for j in result]
        assert matching_job.id in ids
        assert non_matching_job.id not in ids
