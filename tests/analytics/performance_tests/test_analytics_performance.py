"""Performance tests for analytics_service against a realistic data volume
-- the issue's acceptance criteria explicitly calls for this ("test against
seeded/production-scale data, not just a handful of rows"), so a handful-of
-rows correctness test alone doesn't cover it.

Bulk-inserts thousands of jobs/applications via raw executemany (bypassing
the ORM entirely, since we only need rows on disk, not Python objects) and
asserts each analytics query stays well under a generous latency budget.
The budget is intentionally loose (this runs on shared CI hardware) --
the point is to catch an accidentally-unindexed full table scan turning
into a multi-second query, not to benchmark exact latency.
"""

import random
import time
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import insert, select

from src.app.models import ApplicationStatus, Job, JobApplication, JobStatus, User, WorkerProfile
from src.app.schemas.analytics import AnalyticsDateRangeFilter
from src.app.services.analytics_service import get_conversion_funnel, get_platform_breakdown, get_platform_overview
from tests.conftest import create_test_user, create_test_worker_profile

JOB_COUNT = 5_000
QUERY_TIME_BUDGET_SECONDS = 2.0


@pytest.fixture
async def bulk_jobs_and_applications(async_session, customer_test_user: User, test_trade_category):
    now = datetime.now(UTC)
    statuses = [JobStatus.OPEN, JobStatus.ASSIGNED, JobStatus.IN_PROGRESS, JobStatus.COMPLETED, JobStatus.CANCELLED]
    locations = ["Algiers", "Oran", "Constantine", "Annaba", "Setif"]

    job_rows = [
        {
            "title": f"Bulk job {i}",
            "description": "Bulk-seeded for a performance test.",
            "user_id": customer_test_user.id,
            "trade_category_id": test_trade_category.id,
            "budget_min": Decimal("50.00"),
            "budget_max": Decimal("500.00"),
            "display_location": random.choice(locations),
            "status": random.choice(statuses),
            "created_at": now - timedelta(days=random.uniform(0, 120)),
        }
        for i in range(JOB_COUNT)
    ]
    await async_session.execute(insert(Job), job_rows)
    await async_session.commit()

    job_ids = (await async_session.execute(select(Job.id).where(Job.user_id == customer_test_user.id))).scalars().all()

    worker_profiles: list[WorkerProfile] = []
    for _ in range(25):
        worker = await create_test_user(async_session)
        worker_profiles.append(await create_test_worker_profile(async_session, worker))

    application_rows = [
        {
            "job_id": job_id,
            "worker_profile_id": worker_profiles[i % len(worker_profiles)].id,
            "status": random.choice(list(ApplicationStatus)),
            "created_at": now - timedelta(days=random.uniform(0, 120)),
        }
        for i, job_id in enumerate(job_ids)
        if i % 3 != 0  # not every job receives an application
    ]
    await async_session.execute(insert(JobApplication), application_rows)
    await async_session.commit()


@pytest.mark.slow
class TestAnalyticsPerformance:
    async def test_platform_overview_stays_within_budget(self, async_session, bulk_jobs_and_applications):
        start = time.perf_counter()
        await get_platform_overview(async_session, AnalyticsDateRangeFilter())
        elapsed = time.perf_counter() - start

        assert elapsed < QUERY_TIME_BUDGET_SECONDS

    async def test_platform_breakdown_stays_within_budget(self, async_session, bulk_jobs_and_applications):
        start = time.perf_counter()
        await get_platform_breakdown(async_session, AnalyticsDateRangeFilter())
        elapsed = time.perf_counter() - start

        assert elapsed < QUERY_TIME_BUDGET_SECONDS

    async def test_conversion_funnel_stays_within_budget(self, async_session, bulk_jobs_and_applications):
        start = time.perf_counter()
        await get_conversion_funnel(async_session, AnalyticsDateRangeFilter())
        elapsed = time.perf_counter() - start

        assert elapsed < QUERY_TIME_BUDGET_SECONDS

    async def test_date_filtered_overview_stays_within_budget(self, async_session, bulk_jobs_and_applications):
        filters = AnalyticsDateRangeFilter(date_from=datetime.now(UTC) - timedelta(days=30))

        start = time.perf_counter()
        result = await get_platform_overview(async_session, filters)
        elapsed = time.perf_counter() - start

        assert elapsed < QUERY_TIME_BUDGET_SECONDS
        assert result.jobs_posted > 0
