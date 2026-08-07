from decimal import Decimal

import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import Job, TradeCategory, User
from src.app.models import JobStatus
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


# conftest.py  – fixtures to add

@pytest_asyncio.fixture
async def deleted_job(async_session, test_user, test_trade_category):
    job = Job(user_id=test_user.id, trade_category_id=test_trade_category.id,
        title="deleted job", status=JobStatus.OPEN,
        budget_min=Decimal(100), budget_max=Decimal(200), description="test description")

    job.is_deleted = True
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def open_job(async_session, test_user, test_trade_category):
    job = Job(user_id=test_user.id, trade_category_id=test_trade_category.id,
        title="open job", status=JobStatus.OPEN,
        budget_min=Decimal(100), budget_max=Decimal(200), description="test description", )
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def closed_job(async_session, test_user, test_trade_category):
    job = Job(user_id=test_user.id, trade_category_id=test_trade_category.id,
        title="closed job", status=JobStatus.COMPLETED,
        budget_min=Decimal(100), budget_max=Decimal(200), description="test description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def job_other_user(async_session, other_user, test_trade_category):
    job = Job(user_id=other_user.id, trade_category_id=test_trade_category.id,
        title="other user job", status=JobStatus.OPEN,
        budget_min=Decimal(100), budget_max=Decimal(200), description="test description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def job_with_different_trade_category(async_session, test_user, other_trade_category):
    job = Job(user_id=test_user.id, trade_category_id=other_trade_category.id,
        title="different category job", status=JobStatus.OPEN,
        budget_min=Decimal(100), budget_max=Decimal(200), description="test description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def low_budget_job(async_session, test_user, test_trade_category):
    # min=50, max=200 → does NOT overlap with min_budget filter of 500
    job = Job(user_id=test_user.id, trade_category_id=test_trade_category.id,
        title="low budget job", status=JobStatus.OPEN,
        budget_min=Decimal(50), budget_max=Decimal(200), description="test description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def high_budget_job(async_session, test_user, test_trade_category):
    # min=800, max=1500 → does NOT overlap with budget_max filter of 300
    job = Job(user_id=test_user.id, trade_category_id=test_trade_category.id,
        title="high budget job", status=JobStatus.OPEN,
        budget_min=Decimal(800), budget_max=Decimal(1500), description="test description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def mid_budget_job(async_session, test_user, test_trade_category):
    # min=450, max=550 → overlaps [400, 600]
    job = Job(user_id=test_user.id, trade_category_id=test_trade_category.id,
        title="mid budget job", status=JobStatus.OPEN,
        budget_min=Decimal(450), budget_max=Decimal(550), description="test description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def exact_boundary_job(async_session, test_user, test_trade_category):
    job = Job(user_id=test_user.id, trade_category_id=test_trade_category.id,
        title="exact boundary job", status=JobStatus.OPEN,
        budget_min=Decimal(500), budget_max=Decimal(500), description="test description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def job_with_title_plumber(async_session, test_user, test_trade_category):
    job = Job(user_id=test_user.id, trade_category_id=test_trade_category.id,
        title="Plumber needed urgently", status=JobStatus.OPEN,
        budget_min=Decimal(100), budget_max=Decimal(300), description="test description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def job_with_desc_keyword(async_session, test_user, test_trade_category):
    job = Job(user_id=test_user.id, trade_category_id=test_trade_category.id,
        title="general maintenance", description="urgent repair required",
        status=JobStatus.OPEN, budget_min=Decimal(100), budget_max=Decimal(300))
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def deleted_job_with_keyword(async_session, test_user, test_trade_category):
    job = Job(user_id=test_user.id, trade_category_id=test_trade_category.id,
        title="deleted_keyword job", status=JobStatus.OPEN,
        budget_min=Decimal(100), budget_max=Decimal(300), description="test description")
    job.is_deleted = True
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def many_jobs(async_session, test_user, test_trade_category):
    jobs = []
    for i in range(10):
        job = Job(user_id=test_user.id, trade_category_id=test_trade_category.id,
            title=f"job {i}", status=JobStatus.OPEN,
            budget_min=Decimal(100), budget_max=Decimal(300), description="test description")
        async_session.add(job)
        jobs.append(job)
    await async_session.commit()
    return jobs


@pytest_asyncio.fixture
async def many_plumber_jobs(async_session, test_user, test_trade_category):
    jobs = []
    for i in range(10):
        job = Job(user_id=test_user.id, trade_category_id=test_trade_category.id,
            title=f"plumber job {i}", status=JobStatus.OPEN,
            budget_min=Decimal(100), budget_max=Decimal(300), description="test description")
        async_session.add(job)
        jobs.append(job)
    await async_session.commit()
    return jobs


@pytest_asyncio.fixture
async def matching_job(async_session, test_user, test_trade_category):
    # overlaps budget_max filter of 500: min=100, max=800
    job = Job(user_id=test_user.id, trade_category_id=test_trade_category.id,
        title="matching job", status=JobStatus.OPEN,
        budget_min=Decimal(100), budget_max=Decimal(800), description="test description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def non_matching_job(async_session, test_user, test_trade_category):
    # does NOT overlap budget_max filter of 500: min=1000, max=2000
    job = Job(user_id=test_user.id, trade_category_id=test_trade_category.id,
        title="non matching job", status=JobStatus.OPEN,
        budget_min=Decimal(1000), budget_max=Decimal(2000), description="test description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job
