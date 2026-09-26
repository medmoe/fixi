"""Unit tests for analytics_service -- verifies each metric against a
manually counted small dataset (mirrors the issue's acceptance criteria:
"Metrics match manual spot-checks against the database")."""

import pytest

from src.app.models import ApplicationStatus, JobStatus, TradeCategory, User, WorkerProfile
from src.app.schemas.analytics import AnalyticsDateRangeFilter
from src.app.services.analytics_service import get_conversion_funnel, get_platform_breakdown, get_platform_overview
from tests.analytics.conftest import create_application, create_job, days_ago
from tests.conftest import create_test_user, create_test_worker_profile


class TestGetPlatformOverview:
    @pytest.mark.unit
    async def test_counts_jobs_and_applications(
            self, async_session, customer_test_user: User, test_worker_profile: WorkerProfile, test_trade_category: TradeCategory
    ):
        job1 = await create_job(async_session, customer_test_user, test_trade_category)
        await create_job(async_session, customer_test_user, test_trade_category, status=JobStatus.COMPLETED)
        await create_application(async_session, job1, test_worker_profile)
        await create_application(async_session, job1, await create_test_worker_profile(async_session, await create_test_user(async_session)), status=ApplicationStatus.ACCEPTED)

        result = await get_platform_overview(async_session, AnalyticsDateRangeFilter())

        assert result.jobs_posted == 2
        assert result.jobs_completed == 1
        assert result.applications_submitted == 2
        assert result.applications_accepted == 1
        assert result.acceptance_rate == 0.5
        assert result.completion_rate == 0.5

    @pytest.mark.unit
    async def test_zero_denominators_do_not_error(self, async_session):
        result = await get_platform_overview(async_session, AnalyticsDateRangeFilter())

        assert result.jobs_posted == 0
        assert result.acceptance_rate == 0.0
        assert result.completion_rate == 0.0

    @pytest.mark.unit
    async def test_respects_date_range_filter(self, async_session, customer_test_user: User, test_trade_category: TradeCategory):
        await create_job(async_session, customer_test_user, test_trade_category, created_at=days_ago(100))
        await create_job(async_session, customer_test_user, test_trade_category, created_at=days_ago(1))

        result = await get_platform_overview(async_session, AnalyticsDateRangeFilter(date_from=days_ago(10)))

        assert result.jobs_posted == 1

    @pytest.mark.unit
    async def test_excludes_soft_deleted_jobs(self, async_session, customer_test_user: User, test_trade_category: TradeCategory):
        job = await create_job(async_session, customer_test_user, test_trade_category)
        job.is_deleted = True
        await async_session.commit()

        result = await get_platform_overview(async_session, AnalyticsDateRangeFilter())

        assert result.jobs_posted == 0

    @pytest.mark.unit
    async def test_daily_breakdown_groups_by_day(self, async_session, customer_test_user: User, test_trade_category: TradeCategory):
        await create_job(async_session, customer_test_user, test_trade_category, created_at=days_ago(1))
        await create_job(async_session, customer_test_user, test_trade_category, created_at=days_ago(1))
        await create_job(async_session, customer_test_user, test_trade_category, created_at=days_ago(2))

        result = await get_platform_overview(async_session, AnalyticsDateRangeFilter())

        counts = {point.jobs_posted for point in result.daily}
        assert 2 in counts
        assert 1 in counts

    @pytest.mark.unit
    async def test_daily_breakdown_excludes_data_older_than_30_days(
            self, async_session, customer_test_user: User, test_trade_category: TradeCategory
    ):
        await create_job(async_session, customer_test_user, test_trade_category, created_at=days_ago(45))

        result = await get_platform_overview(async_session, AnalyticsDateRangeFilter())

        assert result.daily == []


class TestGetPlatformBreakdown:
    @pytest.mark.unit
    async def test_groups_by_trade_category(self, async_session, customer_test_user: User, test_trade_category: TradeCategory, other_trade_category: TradeCategory):
        await create_job(async_session, customer_test_user, test_trade_category)
        await create_job(async_session, customer_test_user, test_trade_category)
        await create_job(async_session, customer_test_user, other_trade_category)

        result = await get_platform_breakdown(async_session, AnalyticsDateRangeFilter())

        by_id = {item.trade_category_id: item.job_count for item in result.by_trade_category}
        assert by_id[test_trade_category.id] == 2
        assert by_id[other_trade_category.id] == 1

    @pytest.mark.unit
    async def test_groups_jobs_with_no_trade_category(self, async_session, customer_test_user: User):
        await create_job(async_session, customer_test_user, trade_category=None)

        result = await get_platform_breakdown(async_session, AnalyticsDateRangeFilter())

        assert any(item.trade_category_id is None and item.job_count == 1 for item in result.by_trade_category)

    @pytest.mark.unit
    async def test_groups_by_location(self, async_session, customer_test_user: User, test_trade_category: TradeCategory):
        await create_job(async_session, customer_test_user, test_trade_category, display_location="Algiers")
        await create_job(async_session, customer_test_user, test_trade_category, display_location="Algiers")
        await create_job(async_session, customer_test_user, test_trade_category, display_location="Oran")

        result = await get_platform_breakdown(async_session, AnalyticsDateRangeFilter())

        by_location = {item.location: item.job_count for item in result.by_location}
        assert by_location["Algiers"] == 2
        assert by_location["Oran"] == 1

    @pytest.mark.unit
    async def test_ordered_by_job_count_descending(self, async_session, customer_test_user: User, test_trade_category: TradeCategory):
        await create_job(async_session, customer_test_user, test_trade_category, display_location="Oran")
        await create_job(async_session, customer_test_user, test_trade_category, display_location="Algiers")
        await create_job(async_session, customer_test_user, test_trade_category, display_location="Algiers")

        result = await get_platform_breakdown(async_session, AnalyticsDateRangeFilter())

        assert result.by_location[0].location == "Algiers"


class TestGetConversionFunnel:
    @pytest.mark.unit
    async def test_full_funnel(self, async_session, customer_test_user: User, test_trade_category: TradeCategory, test_worker_profile: WorkerProfile):
        await create_job(async_session, customer_test_user, test_trade_category)
        applied_only = await create_job(async_session, customer_test_user, test_trade_category)
        await create_application(async_session, applied_only, test_worker_profile)
        accepted = await create_job(async_session, customer_test_user, test_trade_category, status=JobStatus.ASSIGNED)
        other_worker = await create_test_worker_profile(async_session, await create_test_user(async_session))
        await create_application(async_session, accepted, other_worker)
        completed = await create_job(async_session, customer_test_user, test_trade_category, status=JobStatus.COMPLETED)
        yet_another_worker = await create_test_worker_profile(async_session, await create_test_user(async_session))
        await create_application(async_session, completed, yet_another_worker)

        result = await get_conversion_funnel(async_session, AnalyticsDateRangeFilter())

        assert result.posted == 4
        assert result.applied == 3
        assert result.accepted == 2
        assert result.completed == 1

    @pytest.mark.unit
    async def test_empty_funnel(self, async_session):
        result = await get_conversion_funnel(async_session, AnalyticsDateRangeFilter())

        assert result.posted == 0
        assert result.applied == 0
        assert result.accepted == 0
        assert result.completed == 0

    @pytest.mark.unit
    async def test_a_job_with_multiple_applications_is_counted_once(
            self, async_session, customer_test_user: User, test_trade_category: TradeCategory, test_worker_profile: WorkerProfile
    ):
        job = await create_job(async_session, customer_test_user, test_trade_category)
        await create_application(async_session, job, test_worker_profile)
        other_worker = await create_test_worker_profile(async_session, await create_test_user(async_session))
        await create_application(async_session, job, other_worker)

        result = await get_conversion_funnel(async_session, AnalyticsDateRangeFilter())

        assert result.applied == 1
