from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import Job, TradeCategory, User, JobStatus, JobApplication
from tests.conftest import create_test_user, create_test_worker_profile
from tests.job.helpers import create_test_job


@pytest_asyncio.fixture
async def test_job(async_session: AsyncSession, test_trade_category: TradeCategory, customer_test_user: User) -> Job:
    return await create_test_job(async_session, customer_test_user, test_trade_category=test_trade_category)


@pytest_asyncio.fixture
async def deleted_job(async_session, customer_test_user, test_trade_category):
    job = Job(user_id=customer_test_user.id, trade_category_id=test_trade_category.id,
        title="deleted job", status=JobStatus.OPEN,
        budget_min=Decimal(100), budget_max=Decimal(200), description="test description")

    job.is_deleted = True
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def open_job(async_session, customer_test_user, test_trade_category):
    job = Job(user_id=customer_test_user.id, trade_category_id=test_trade_category.id,
        title="open job", status=JobStatus.OPEN,
        budget_min=Decimal(100), budget_max=Decimal(200), description="test description", )
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def closed_job(async_session, customer_test_user, test_trade_category):
    job = Job(user_id=customer_test_user.id, trade_category_id=test_trade_category.id,
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
async def job_with_different_trade_category(async_session, customer_test_user, other_trade_category):
    job = Job(user_id=customer_test_user.id, trade_category_id=other_trade_category.id,
        title="different category job", status=JobStatus.OPEN,
        budget_min=Decimal(100), budget_max=Decimal(200), description="test description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def low_budget_job(async_session, customer_test_user, test_trade_category):
    # min=50, max=200 → does NOT overlap with min_budget filter of 500
    job = Job(user_id=customer_test_user.id, trade_category_id=test_trade_category.id,
        title="low budget job", status=JobStatus.OPEN,
        budget_min=Decimal(50), budget_max=Decimal(200), description="test description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def high_budget_job(async_session, customer_test_user, test_trade_category):
    # min=800, max=1500 → does NOT overlap with budget_max filter of 300
    job = Job(user_id=customer_test_user.id, trade_category_id=test_trade_category.id,
        title="high budget job", status=JobStatus.OPEN,
        budget_min=Decimal(800), budget_max=Decimal(1500), description="test description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def mid_budget_job(async_session, customer_test_user, test_trade_category):
    # min=450, max=550 → overlaps [400, 600]
    job = Job(user_id=customer_test_user.id, trade_category_id=test_trade_category.id,
        title="mid budget job", status=JobStatus.OPEN,
        budget_min=Decimal(450), budget_max=Decimal(550), description="test description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def exact_boundary_job(async_session, customer_test_user, test_trade_category):
    job = Job(user_id=customer_test_user.id, trade_category_id=test_trade_category.id,
        title="exact boundary job", status=JobStatus.OPEN,
        budget_min=Decimal(500), budget_max=Decimal(500), description="test description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def job_with_title_plumber(async_session, customer_test_user, test_trade_category):
    job = Job(
        user_id=customer_test_user.id,
        trade_category_id=test_trade_category.id,
        title="Plumber needed urgently",
        status=JobStatus.OPEN,
        budget_min=Decimal(100),
        budget_max=Decimal(300),
        description="test description"
    )
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def job_with_desc_keyword(async_session, customer_test_user, test_trade_category):
    job = Job(user_id=customer_test_user.id, trade_category_id=test_trade_category.id,
        title="general maintenance", description="urgent repair required",
        status=JobStatus.OPEN, budget_min=Decimal(100), budget_max=Decimal(300))
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def deleted_job_with_keyword(async_session, customer_test_user, test_trade_category):
    job = Job(user_id=customer_test_user.id, trade_category_id=test_trade_category.id,
        title="deleted_keyword job", status=JobStatus.OPEN,
        budget_min=Decimal(100), budget_max=Decimal(300), description="test description")
    job.is_deleted = True
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def many_jobs(async_session, customer_test_user, test_trade_category):
    jobs = []
    for i in range(55):
        job = Job(user_id=customer_test_user.id, trade_category_id=test_trade_category.id,
            title=f"job {i}", status=JobStatus.OPEN,
            budget_min=Decimal(100), budget_max=Decimal(300), description="test description")
        async_session.add(job)
        jobs.append(job)
    await async_session.commit()
    return jobs


@pytest_asyncio.fixture
async def many_plumber_jobs(async_session, customer_test_user, test_trade_category):
    jobs = []
    for i in range(20):
        job = Job(user_id=customer_test_user.id, trade_category_id=test_trade_category.id,
            title=f"plumber job {i}", status=JobStatus.OPEN,
            budget_min=Decimal(100), budget_max=Decimal(300), description="test description")
        async_session.add(job)
        jobs.append(job)
    await async_session.commit()
    return jobs


@pytest_asyncio.fixture
async def matching_job(async_session, customer_test_user, test_trade_category):
    # overlaps budget_max filter of 500: min=100, max=800
    job = Job(user_id=customer_test_user.id, trade_category_id=test_trade_category.id,
        title="matching job", status=JobStatus.OPEN,
        budget_min=Decimal(100), budget_max=Decimal(800), description="test description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def non_matching_job(async_session, customer_test_user, test_trade_category):
    # does NOT overlap budget_max filter of 500: min=1000, max=2000
    job = Job(user_id=customer_test_user.id, trade_category_id=test_trade_category.id,
        title="non matching job", status=JobStatus.OPEN,
        budget_min=Decimal(1000), budget_max=Decimal(2000), description="test description")
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest_asyncio.fixture
async def test_job_application(async_session, test_worker_profile, test_job):
    job_application = JobApplication(job_id=test_job.id, worker_profile_id=test_worker_profile.id)
    async_session.add(job_application)
    await async_session.commit()
    await async_session.refresh(job_application)
    return job_application


@pytest_asyncio.fixture
async def job_application_factory(async_session):
    """
    Creates `count` JobApplication rows against the given job, each from a
    distinct worker (a new User + WorkerProfile per application), since the
    (job_id, worker_profile_id) pair is unique — the same worker can't apply
    to the same job twice.

    Usage:
        [application] = await job_application_factory(job=other_job, count=1)
        applications = await job_application_factory(job=test_job, count=5)
    """

    async def _create(job: Job, count: int = 1, **overrides) -> list[JobApplication]:
        applications = []

        for _ in range(count):
            worker_user = await create_test_user(async_session)
            worker_profile = await create_test_worker_profile(async_session, user=worker_user)

            defaults = {
                "job_id": job.id,
                "worker_profile_id": worker_profile.id,
                "message": None,
            }
            defaults.update(overrides)

            application = JobApplication(**defaults)
            async_session.add(application)
            applications.append(application)

        await async_session.commit()
        for application in applications:
            await async_session.refresh(application)

        return applications

    return _create


@pytest.fixture
def job_filters(**overrides):
    return {
        "status": None,
        "trade_category_id": None,
        "user_id": None,
        "budget_min": None,
        "budget_max": None,
        "search": None,
        **overrides
    }


@pytest.fixture
def job_create_payload(test_trade_category):
    return {
        "title": "Need a plumber urgently",
        "description": "Pipe burst in the kitchen",
        "trade_category_id": test_trade_category.id,
        "budget_min": 100.00,
        "budget_max": 500.00,
        "latitude": 40.7128,
        "longitude": -74.0060
    }


# —————— conftest nearby workers ——————————————————————————————————————————————————————————————————————————————————————————————————————————————

ALGIERS_LOCATION = "POINT(3.0588 36.7538)"
NEAR_LOCATION = "POINT(3.0620 36.7550)"  # ~2km from Algiers
MID_LOCATION = "POINT(3.1200 36.7900)"  # ~8km from Algiers
FAR_LOCATION = "POINT(-0.6337 35.6971)"  # Oran — ~350km from Algiers


@pytest_asyncio.fixture
async def job_in_algiers(async_session, customer_test_user, test_trade_category):
    return await create_test_job(
        async_session, test_trade_category=test_trade_category, test_user=customer_test_user, location=ALGIERS_LOCATION
    )


@pytest_asyncio.fixture
async def job_in_algiers_plumbing(async_session, customer_test_user, test_trade_category_plumbing):
    return await create_test_job(
        async_session, test_user=customer_test_user, test_trade_category=test_trade_category_plumbing, location=ALGIERS_LOCATION
    )


@pytest_asyncio.fixture
async def job_in_algiers_no_category(async_session, customer_test_user):
    return await create_test_job(
        async_session, test_user=customer_test_user, test_trade_category=None, location=ALGIERS_LOCATION
    )


@pytest_asyncio.fixture
async def job_with_no_location(async_session, customer_test_user, test_trade_category):
    return await create_test_job(
        async_session, test_user=customer_test_user, test_trade_category=test_trade_category, location=None
    )


@pytest_asyncio.fixture
async def worker_covers_job_location(async_session):
    user = await create_test_user(async_session, location=NEAR_LOCATION)
    return await create_test_worker_profile(
        async_session, user=user, service_radius_km=20, is_available=True
    )


@pytest_asyncio.fixture
async def worker_covers_job_location_unavailable(async_session):
    user = await create_test_user(async_session, location=NEAR_LOCATION)
    return await create_test_worker_profile(
        async_session, user=user, service_radius_km=20, is_available=False
    )


@pytest_asyncio.fixture
async def worker_far_away_small_radius(async_session):
    user = await create_test_user(async_session, location=FAR_LOCATION)
    return await create_test_worker_profile(
        async_session, user=user, service_radius_km=10, is_available=True
    )


@pytest_asyncio.fixture
async def worker_no_location(async_session):
    user = await create_test_user(async_session, location=None)
    return await create_test_worker_profile(
        async_session, user=user, service_radius_km=50, is_available=True
    )


@pytest_asyncio.fixture
async def worker_near_job(async_session):
    user = await create_test_user(async_session, location=NEAR_LOCATION)
    return await create_test_worker_profile(
        async_session, user=user, service_radius_km=20, is_available=True
    )


@pytest_asyncio.fixture
async def worker_mid_distance_from_job(async_session):
    user = await create_test_user(async_session, location=MID_LOCATION)
    return await create_test_worker_profile(
        async_session, user=user, service_radius_km=20, is_available=True
    )


@pytest_asyncio.fixture
async def worker_plumbing_covers_job(async_session, test_trade_category_plumbing):
    user = await create_test_user(async_session, location=NEAR_LOCATION)
    return await create_test_worker_profile(
        async_session,
        user=user,
        trade_category=test_trade_category_plumbing,
        service_radius_km=20,
        is_available=True,
    )


@pytest_asyncio.fixture
async def worker_electrical_covers_job(async_session, test_trade_category_electrical):
    user = await create_test_user(async_session, location=NEAR_LOCATION)
    return await create_test_worker_profile(
        async_session,
        user=user,
        trade_category=test_trade_category_electrical,
        service_radius_km=20,
        is_available=True,
    )


@pytest_asyncio.fixture
async def test_trade_category_plumbing(async_session):
    category = TradeCategory(name="plumbing", display_name="Plumbing")
    async_session.add(category)
    await async_session.commit()
    await async_session.refresh(category)
    return category


@pytest_asyncio.fixture
async def test_trade_category_electrical(async_session):
    category = TradeCategory(name="electrical", display_name="Electrical")
    async_session.add(category)
    await async_session.commit()
    await async_session.refresh(category)
    return category


@pytest_asyncio.fixture
async def many_jobs_same_customer(async_session, customer_test_user, test_trade_category):
    jobs = [
        Job(
            user_id=customer_test_user.id,
            trade_category_id=test_trade_category.id,
            title=f"job {i}",
            status=JobStatus.OPEN,
            budget_min=Decimal("100.00"),
            budget_max=Decimal("300.00"),
            description="test description"
        )
        for i in range(10)
    ]
    async_session.add_all(jobs)
    await async_session.commit()
    return jobs
