import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import Job, TradeCategory, User
from tests.unit_tests.crud_tests.job.mocks import mock_jobs


async def create_test_job(
        async_session: AsyncSession,
        test_trade_category: TradeCategory,
        test_user: User
) -> Job:
    job = Job(
        title=mock_jobs[0]["title"],
        description=mock_jobs[0]["description"],
        trade_category_id=test_trade_category.id,
        user_id=test_user.id,
        budget_min=mock_jobs[0]['budget_min'],
        budget_max=mock_jobs[0]['budget_max'],
        display_location=mock_jobs[0]['display_location'],
        location="POINT(0 0)"
    )
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def test_job(async_session: AsyncSession, test_trade_category: TradeCategory, test_user: User) -> Job:
    return await create_test_job(async_session, test_trade_category, test_user)
