# tests/worker/conftest.py — fixtures (unchanged signatures, only the helper changed)

from decimal import Decimal

import pytest_asyncio

from src.app.models import TradeCategory
from tests.conftest import create_test_worker_profile, create_test_user


@pytest_asyncio.fixture
async def worker_with_plumbing(async_session, test_trade_category_plumbing):
    return await create_test_worker_profile(
        async_session,
        trade_category=test_trade_category_plumbing,
        is_available=True,
        is_verified=False,
        hourly_rate=Decimal("75.00"),
        years_of_experience=5,
        service_radius_km=50,
    )


@pytest_asyncio.fixture
async def worker_with_plumbing_unavailable(async_session, test_trade_category_plumbing):
    return await create_test_worker_profile(
        async_session,
        trade_category=test_trade_category_plumbing,
        is_available=False,
        is_verified=False,
        hourly_rate=Decimal("75.00"),
        years_of_experience=5,
        service_radius_km=50,
    )


@pytest_asyncio.fixture
async def worker_with_electrical(async_session, test_trade_category_electrical):
    return await create_test_worker_profile(
        async_session,
        trade_category=test_trade_category_electrical,
        is_available=True,
    )


@pytest_asyncio.fixture
async def worker_low_rate(async_session):
    return await create_test_worker_profile(async_session, hourly_rate=Decimal("20.00"))


@pytest_asyncio.fixture
async def worker_mid_rate(async_session):
    return await create_test_worker_profile(async_session, hourly_rate=Decimal("75.00"))


@pytest_asyncio.fixture
async def worker_high_rate(async_session):
    return await create_test_worker_profile(async_session, hourly_rate=Decimal("150.00"))


@pytest_asyncio.fixture
async def worker_junior(async_session):
    return await create_test_worker_profile(async_session, years_of_experience=1)


@pytest_asyncio.fixture
async def worker_mid(async_session):
    return await create_test_worker_profile(async_session, years_of_experience=5)


@pytest_asyncio.fixture
async def worker_senior(async_session):
    return await create_test_worker_profile(async_session, years_of_experience=10)


@pytest_asyncio.fixture
async def worker_junior_low_rate(async_session):
    return await create_test_worker_profile(
        async_session, years_of_experience=1, hourly_rate=Decimal("20.00")
    )


@pytest_asyncio.fixture
async def worker_senior_high_rate(async_session):
    return await create_test_worker_profile(
        async_session, years_of_experience=10, hourly_rate=Decimal("150.00")
    )


@pytest_asyncio.fixture
async def worker_senior_low_rate(async_session):
    return await create_test_worker_profile(
        async_session, years_of_experience=10, hourly_rate=Decimal("20.00")
    )


@pytest_asyncio.fixture
async def worker_small_radius(async_session):
    return await create_test_worker_profile(async_session, service_radius_km=10)


@pytest_asyncio.fixture
async def worker_large_radius(async_session):
    return await create_test_worker_profile(async_session, service_radius_km=100)


@pytest_asyncio.fixture
async def worker_available(async_session):
    return await create_test_worker_profile(async_session, is_available=True)


@pytest_asyncio.fixture
async def worker_unavailable(async_session):
    return await create_test_worker_profile(async_session, is_available=False)


@pytest_asyncio.fixture
async def worker_verified(async_session):
    return await create_test_worker_profile(async_session, is_verified=True)


@pytest_asyncio.fixture
async def worker_unverified(async_session):
    return await create_test_worker_profile(async_session, is_verified=False)


@pytest_asyncio.fixture
async def worker_verified_large_radius(async_session):
    return await create_test_worker_profile(
        async_session, is_verified=True, service_radius_km=100
    )


@pytest_asyncio.fixture
async def worker_verified_small_radius(async_session):
    return await create_test_worker_profile(
        async_session, is_verified=True, service_radius_km=10
    )


@pytest_asyncio.fixture
async def worker_unverified_large_radius(async_session):
    return await create_test_worker_profile(
        async_session, is_verified=False, service_radius_km=100
    )


@pytest_asyncio.fixture
async def perfect_match_worker(async_session, test_trade_category_plumbing):
    return await create_test_worker_profile(
        async_session,
        trade_category=test_trade_category_plumbing,
        hourly_rate=Decimal("80.00"),
        years_of_experience=5,
        service_radius_km=50,
        is_available=True,
        is_verified=True,
    )


@pytest_asyncio.fixture
async def partial_match_worker(async_session, test_trade_category_plumbing):
    # fails hourly rate filter (too high)
    return await create_test_worker_profile(
        async_session,
        trade_category=test_trade_category_plumbing,
        hourly_rate=Decimal("200.00"),
        years_of_experience=5,
        service_radius_km=50,
        is_available=True,
        is_verified=True,
    )


@pytest_asyncio.fixture
async def many_worker_profiles(async_session):
    return [
        await create_test_worker_profile(async_session)
        for _ in range(25)
    ]


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


# ─── Reference points used across fixtures ──────────────────────────────────
# Algiers city center: 36.7538 N, 3.0588 E
# Oran city center:    35.6971 N, -0.6337 E  (~350km from Algiers)
# WKT format is POINT(longitude latitude) — note the order: lon first, lat second

ALGIERS_LOCATION = "POINT(3.0588 36.7538)"
ORAN_LOCATION = "POINT(-0.6337 35.6971)"


@pytest_asyncio.fixture
async def worker_in_algiers(async_session):
    """Worker located in Algiers, no specific radius assertion needed for non-geo tests."""
    user = await create_test_user(async_session, location=ALGIERS_LOCATION)
    return await create_test_worker_profile(async_session, user=user, service_radius_km=20)


@pytest_asyncio.fixture
async def worker_in_oran(async_session):
    user = await create_test_user(async_session, location=ORAN_LOCATION)
    return await create_test_worker_profile(async_session, user=user, service_radius_km=20)


@pytest_asyncio.fixture
async def worker_in_algiers_covers_customer(async_session):
    """
    Located in central Algiers with a 20km radius — comfortably covers a
    customer point ~5km away (36.7600, 3.0500 in the tests above).
    """
    user = await create_test_user(async_session, location=ALGIERS_LOCATION)
    return await create_test_worker_profile(
        async_session, user=user, service_radius_km=20, is_verified=True
    )


@pytest_asyncio.fixture
async def worker_in_algiers_unverified(async_session):
    user = await create_test_user(async_session, location=ALGIERS_LOCATION)
    return await create_test_worker_profile(
        async_session, user=user, service_radius_km=20, is_verified=False
    )


@pytest_asyncio.fixture
async def worker_in_oran_small_radius(async_session):
    """
    Located in Oran with only a 10km radius — far outside range of an
    Algiers-based customer search (~350km away).
    """
    user = await create_test_user(async_session, location=ORAN_LOCATION)
    return await create_test_worker_profile(async_session, user=user, service_radius_km=10)


@pytest_asyncio.fixture
async def worker_no_location(async_session):
    """User with location=None — must be excluded from any geo search."""
    user = await create_test_user(async_session, location=None)
    return await create_test_worker_profile(async_session, user=user, service_radius_km=50)


@pytest_asyncio.fixture
async def worker_at_exact_boundary(async_session):
    """
    Located ~5km west of the test customer point, with service_radius_km
    set to comfortably include that distance — used to assert boundary
    inclusivity of ST_DWithin (<=), not to hit an exact meter-perfect edge
    (floating point distance math makes an exact edge test flaky).
    """
    user = await create_test_user(async_session, location=ALGIERS_LOCATION)
    return await create_test_worker_profile(async_session, user=user, service_radius_km=6)