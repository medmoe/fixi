import pytest_asyncio

from src.app.models import Job, TradeCategory, User
from tests.job.helpers import create_test_job


@pytest_asyncio.fixture
async def test_job(async_session, test_trade_category: TradeCategory, customer_test_user: User) -> Job:
    return await create_test_job(async_session, customer_test_user, test_trade_category=test_trade_category)
