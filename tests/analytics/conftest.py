from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import ApplicationStatus, Job, JobApplication, JobStatus, TradeCategory, User, WorkerProfile
from tests.job.helpers import create_test_job


@pytest_asyncio.fixture
async def test_job(async_session: AsyncSession, test_trade_category: TradeCategory, customer_test_user: User) -> Job:
    return await create_test_job(async_session, customer_test_user, test_trade_category=test_trade_category)


async def create_job(
        async_session: AsyncSession, user: User, trade_category: TradeCategory | None = None,
        status: JobStatus = JobStatus.OPEN, created_at: datetime | None = None, **overrides,
) -> Job:
    job = Job(
        user_id=user.id, trade_category_id=trade_category.id if trade_category else None,
        title=overrides.pop("title", "Analytics test job"),
        description=overrides.pop("description", "test description"),
        budget_min=overrides.pop("budget_min", Decimal("100.00")),
        budget_max=overrides.pop("budget_max", Decimal("200.00")),
        display_location=overrides.pop("display_location", "Algiers"),
        status=status,
        **overrides,
    )
    async_session.add(job)
    await async_session.commit()
    if created_at is not None:
        job.created_at = created_at
        await async_session.commit()
    await async_session.refresh(job)
    return job


async def create_application(
        async_session: AsyncSession, job: Job, worker_profile: WorkerProfile,
        status: ApplicationStatus = ApplicationStatus.PENDING, created_at: datetime | None = None,
) -> JobApplication:
    application = JobApplication(job_id=job.id, worker_profile_id=worker_profile.id, status=status)
    async_session.add(application)
    await async_session.commit()
    if created_at is not None:
        application.created_at = created_at
        await async_session.commit()
    await async_session.refresh(application)
    return application


def days_ago(n: int) -> datetime:
    return datetime.now(UTC) - timedelta(days=n)
