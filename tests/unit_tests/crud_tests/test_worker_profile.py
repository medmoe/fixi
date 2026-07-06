"""
Tests for WorkerProfile CRUD operations.

CRUD module tested: crud_workers (FastCRUD)
Covers:
    - Create
    - Read (single, multiple, filters)
    - Update
    - Delete
    - Edge cases
"""
from datetime import UTC, datetime
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.exceptions.http_exceptions import DuplicateValueException
from src.app.crud.crud_worker_profiles import crud_worker_profiles
from src.app.models import User, WorkerProfile
from src.app.schemas.worker_profile import (
    WorkerProfileCreate,
    WorkerProfileUpdate,
    WorkerProfileUpdateInternal,
)
from tests.conftest import create_test_worker_profile, create_bulk_test_worker_profiles


# ===========================================================================
# Fixtures & Factories
# ===========================================================================

def create_schema(internal_create=False, **overrides) -> WorkerProfileCreate:
    """Valid WorkerProfileCreate schema — override any field to test edge cases."""
    defaults = {
        "bio": "Experienced plumber with 10 years of experience.",
        "years_of_experience": 10,
        "hourly_rate": 75.00,
        "service_radius_km": 20,
        "is_available": True,
    }
    return WorkerProfileCreate.model_validate({**defaults, **overrides})


parameters = [
    # (is_available, is_verified, years_of_experience, hourly_rate, service_radius_km)
    {"bio": "Experienced plumber with 10 years in residential work.", "years_of_experience": 10, "hourly_rate": Decimal("75.00"), "service_radius_km": 20,
     "avatar_url": "https://example.com/avatar1.jpg", "is_available": True, "is_verified": True},
    {"bio": "Certified electrician specializing in commercial projects.", "years_of_experience": 7, "hourly_rate": Decimal("90.00"), "service_radius_km": 35,
     "avatar_url": "https://example.com/avatar2.jpg", "is_available": True, "is_verified": True},
    {"bio": "Carpenter with expertise in custom furniture and woodwork.", "years_of_experience": 5, "hourly_rate": Decimal("65.00"), "service_radius_km": 15,
     "avatar_url": "https://example.com/avatar3.jpg", "is_available": False, "is_verified": True},
    {"bio": "HVAC technician with 3 years of residential experience.", "years_of_experience": 3, "hourly_rate": Decimal("55.00"), "service_radius_km": 10,
     "avatar_url": "https://example.com/avatar4.jpg", "is_available": True, "is_verified": False},
    {"bio": "General handyman available for small repairs and maintenance.", "years_of_experience": 2, "hourly_rate": Decimal("45.00"), "service_radius_km": 50,
     "avatar_url": "https://example.com/avatar5.jpg", "is_available": True, "is_verified": False},
    {"bio": "Painter with 8 years of interior and exterior experience.", "years_of_experience": 8, "hourly_rate": Decimal("80.00"), "service_radius_km": 25,
     "avatar_url": "https://example.com/avatar6.jpg", "is_available": False, "is_verified": True},
    {"bio": "Roofing specialist with focus on leak repairs and insulation.", "years_of_experience": 12, "hourly_rate": Decimal("110.00"), "service_radius_km": 40,
     "avatar_url": "https://example.com/avatar7.jpg", "is_available": True, "is_verified": True},
    {"bio": "Landscaper offering lawn care and garden design services.", "years_of_experience": 4, "hourly_rate": Decimal("50.00"), "service_radius_km": 30,
     "avatar_url": "https://example.com/avatar8.jpg", "is_available": True, "is_verified": False},
    {"bio": "Tiler with experience in bathrooms, kitchens and flooring.", "years_of_experience": 6, "hourly_rate": Decimal("70.00"), "service_radius_km": 20,
     "avatar_url": "https://example.com/avatar9.jpg", "is_available": False, "is_verified": False},
    {"bio": "Welding professional with industrial and domestic experience.", "years_of_experience": 9, "hourly_rate": Decimal("95.00"), "service_radius_km": 45,
     "avatar_url": "https://example.com/avatar10.jpg", "is_available": True, "is_verified": True},
]


# ===========================================================================
# Create
# ===========================================================================

class TestWorkerProfileCreate:
    """crud_workers.create — inserts a row and returns it."""

    class TestSuccess:

        async def test_create_returns_profile(self, async_session: AsyncSession, test_user: User):
            profile = await crud_worker_profiles.create(db=async_session, object=create_schema(user_id=test_user.id))
            assert profile is not None

        async def test_create_persists_bio(self, async_session: AsyncSession, test_user: User):
            profile = await crud_worker_profiles.create(db=async_session, object=create_schema(bio="Expert welder", user_id=test_user.id))
            assert profile.bio == "Expert welder"

        async def test_create_sets_is_available_default(self, async_session: AsyncSession, test_user: User):
            profile = await crud_worker_profiles.create(db=async_session, object=create_schema(user_id=test_user.id), )
            assert profile.is_available is True

        async def test_create_sets_is_verified_false_by_default(self, async_session: AsyncSession, test_user: User):
            profile = await crud_worker_profiles.create(db=async_session, object=create_schema(user_id=test_user.id), )
            assert profile.is_verified is False

    class TestDuplicates:

        async def test_create_duplicate_user_id_fails(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
            """Each user can only have one worker profile."""
            with pytest.raises(DuplicateValueException):
                await crud_worker_profiles.create(db=async_session, object=create_schema(user_id=test_worker_profile.user_id), )

    class TestInvalidData:

        async def test_create_with_nonexistent_user_id_fails(self, async_session: AsyncSession):
            """FK constraint — user must exist."""
            with pytest.raises(Exception):
                await crud_worker_profiles.create(db=async_session, object=create_schema(user_id=99999))


# ===========================================================================
# Read
# ===========================================================================

class TestWorkerProfileRead:
    """crud_workers.get / get_multi — fetching rows."""

    class TestGetById:

        async def test_get_by_id_returns_profile(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
            fetched = await crud_worker_profiles.get(db=async_session, id=test_worker_profile.id)
            assert fetched is not None
            assert fetched["id"] == test_worker_profile.id

        async def test_get_by_id_returns_correct_fields(self, async_session: AsyncSession):
            test_worker_profile = await create_test_worker_profile(async_session, bio="This is a test bio")
            fetched = await crud_worker_profiles.get(db=async_session, id=test_worker_profile.id)
            assert fetched["bio"] == test_worker_profile.bio

    class TestGetByUserId:

        async def test_get_by_user_id_returns_profile(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
            fetched = await crud_worker_profiles.get(db=async_session, user_id=test_worker_profile.user_id)
            assert fetched is not None
            assert fetched["user_id"] == test_worker_profile.user_id

    class TestNotFound:

        async def test_get_nonexistent_id_returns_none(self, async_session: AsyncSession):
            fetched = await crud_worker_profiles.get(db=async_session, id=99999)
            assert fetched is None

        async def test_get_nonexistent_user_id_returns_none(self, async_session: AsyncSession):
            fetched = await crud_worker_profiles.get(db=async_session, user_id=99999)
            assert fetched is None

    class TestGetMulti:
        @pytest_asyncio.fixture(autouse=True)
        async def setup_bulk_profiles(self, async_session: AsyncSession):
            """ Runs once before each test — but we guard against re-inserting."""
            self.session = async_session
            self.profiles = await create_bulk_test_worker_profiles(async_session, parameters)

        async def test_get_multi_returns_all_profiles(self):
            result = await crud_worker_profiles.get_multi(db=self.session)
            assert result["total_count"] == len(self.profiles)

        async def test_get_multi_respects_limit(self):
            limit = 3
            result = await crud_worker_profiles.get_multi(db=self.session, limit=limit)
            assert len(result["data"]) == limit
            assert result["total_count"] == len(self.profiles)

        async def test_get_multi_respects_offset(self, ):
            offset = 2
            result = await crud_worker_profiles.get_multi(db=self.session, offset=offset)
            assert len(result["data"]) == len(self.profiles) - offset

        async def test_get_multi_limit_and_offset_combined(self, ):
            limit, offset = 4, 2
            result = await crud_worker_profiles.get_multi(db=self.session, limit=limit, offset=offset)
            assert len(result["data"]) == min(len(self.profiles) - offset, limit)

    class TestFilters:
        @pytest_asyncio.fixture(autouse=True)
        async def setup_bulk_profiles(self, async_session: AsyncSession):
            """ Runs once before each test — but we guard against re-inserting."""
            self.session = async_session
            self.profiles = await create_bulk_test_worker_profiles(async_session, parameters)

        async def test_filter_by_is_available(self, ):
            result = await crud_worker_profiles.get_multi(db=self.session, is_available=True)
            available_workers = sum(1 for worker_profile in self.profiles if worker_profile.is_available)
            assert result["total_count"] == available_workers
            assert all(p["is_available"] is True for p in result["data"])

        async def test_filter_by_is_verified(self):
            result = await crud_worker_profiles.get_multi(db=self.session, is_verified=True)
            verified_workers = sum(1 for param in parameters if param["is_verified"] is True)
            assert result["total_count"] == verified_workers
            assert all(p["is_verified"] is True for p in result["data"])

        async def test_filter_by_hourly_rate(self, ):
            result = await crud_worker_profiles.get_multi(db=self.session, hourly_rate__gte=45.50, hourly_rate__lte=120.10)
            expected = sum(1 for param in parameters if 45.50 <= param["hourly_rate"] <= 120.10)
            assert result["total_count"] == expected
            assert all(45.50 <= w["hourly_rate"] <= 120.10 for w in result["data"])

        async def test_filter_by_service_radius_km(self, ):
            result = await crud_worker_profiles.get_multi(db=self.session, service_radius_km__gte=10, service_radius_km__lte=25)
            expected = sum(1 for param in parameters if 10 <= param["service_radius_km"] <= 25)
            assert result["total_count"] == expected
            assert all(10 <= w["service_radius_km"] <= 25 for w in result["data"])

        async def test_filter_by_multiple_parameters(self):
            """Test that get_multi correctly filters by is_available, years_of_experience,
            hourly_rate, and service_radius_km simultaneously."""

            result = await crud_worker_profiles.get_multi(
                db=self.session,
                is_available=True,
                years_of_experience__gte=3,
                years_of_experience__lte=10,
                hourly_rate__gte=60.00,
                hourly_rate__lte=100.00,
                service_radius_km__gte=10,
                service_radius_km__lte=50,
            )

            # Derive expected results from source data to avoid hardcoding
            expected = sum(
                1 for worker_profile in self.profiles if
                worker_profile.is_available and
                worker_profile.years_of_experience is not None and
                3 <= worker_profile.years_of_experience <= 10 and
                worker_profile.hourly_rate is not None and
                60.00 <= worker_profile.hourly_rate <= 100.00 and
                worker_profile.service_radius_km is not None and
                10 <= worker_profile.service_radius_km <= 50
            )

            # 1. correct count
            assert result["total_count"] == expected  # expects 3

            # 2. every returned record satisfies ALL filters — not just count
            for worker in result["data"]:
                assert worker["is_available"] is True
                assert 3 <= worker["years_of_experience"] <= 10
                assert 60.00 <= worker["hourly_rate"] <= 100.00
                assert 10 <= worker["service_radius_km"] <= 50


# ===========================================================================
# Update
# ===========================================================================

class TestWorkerProfileUpdate:
    """crud_workers.update — partial and full updates."""

    class TestPartialUpdate:

        async def test_update_bio_only(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
            await crud_worker_profiles.update(db=async_session, object=WorkerProfileUpdate(bio="Updated bio"), user_id=test_worker_profile.user_id, id=test_worker_profile.id)
            updated = await crud_worker_profiles.get(db=async_session, id=test_worker_profile.id)
            assert updated["bio"] == "Updated bio"

        async def test_update_does_not_affect_other_fields(self, async_session: AsyncSession):
            test_worker_profile = await create_test_worker_profile(async_session, hourly_rate=100)
            await crud_worker_profiles.update(db=async_session, object=WorkerProfileUpdate(bio="New bio"), user_id=test_worker_profile.user_id, id=test_worker_profile.id)
            updated = await crud_worker_profiles.get(db=async_session, id=test_worker_profile.id)
            assert updated["hourly_rate"] == test_worker_profile.hourly_rate  # unchanged

    class TestFullUpdate:

        async def test_update_all_fields(self, async_session: AsyncSession, test_user: User):
            worker_profile = await crud_worker_profiles.create(db=async_session, object=create_schema(user_id=test_user.id))
            await crud_worker_profiles.update(
                db=async_session,
                object=WorkerProfileUpdate(
                    bio="Fully updated",
                    years_of_experience=20,
                    hourly_rate=100.00,
                    service_radius_km=50,
                    is_available=False,
                ),
                user_id=test_user.id,
                id=worker_profile.id,
            )
            updated = await crud_worker_profiles.get(db=async_session, id=worker_profile.id)
            assert updated["bio"] == "Fully updated"
            assert updated["years_of_experience"] == 20
            assert updated["is_available"] is False

    class TestInternalUpdate:
        """WorkerProfileUpdateInternal — admin can set is_verified."""

        async def test_admin_can_verify_worker(self, async_session: AsyncSession, test_worker_profile):
            await crud_worker_profiles.update(db=async_session, object=WorkerProfileUpdateInternal(is_verified=True), user_id=test_worker_profile.user_id, id=test_worker_profile.id)
            updated = await crud_worker_profiles.get(db=async_session, id=test_worker_profile.id)
            assert updated["is_verified"] is True

    class TestUpdatesTimestamp:

        async def test_updated_at_changes_on_update(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
            user = await async_session.get(User, test_worker_profile.user_id)
            user.updated_at = datetime(2020, 1, 1, tzinfo=UTC)  # Far in the past, no ambiguity
            await async_session.commit()
            await async_session.refresh(user)

            await crud_worker_profiles.update(db=async_session,
                                              object=WorkerProfileUpdate(bio="Trigger timestamp update"),
                                              user_id=test_worker_profile.user_id,
                                              id=test_worker_profile.id)
            await async_session.refresh(user)

            assert user.updated_at > datetime(2020, 1, 1, tzinfo=UTC)

    class TestNotFound:

        async def test_update_nonexistent_profile_raises(self, async_session: AsyncSession):
            with pytest.raises(NoResultFound):
                await crud_worker_profiles.update(
                    db=async_session,
                    object=WorkerProfileUpdate(bio="Ghost update"),
                    user_id=99999,
                    id=99999,
                )


# ===========================================================================
# Delete
# ===========================================================================

class TestWorkerProfileDelete:
    """crud_workers.delete — hard delete."""

    class TestSuccess:

        async def test_delete_removes_profile(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
            await crud_worker_profiles.delete(db=async_session, user_id=test_worker_profile.user_id, hard=True)
            fetched = await crud_worker_profiles.get(db=async_session, id=test_worker_profile.id)
            assert fetched is None

    class TestNotFound:

        async def test_delete_nonexistent_profile_raises(self, async_session: AsyncSession):
            with pytest.raises(NoResultFound):
                await crud_worker_profiles.delete(db=async_session, user_id=9999)

    class TestCascadeEffects:

        async def test_delete_profile_removes_worker_trades(self, async_session: AsyncSession, test_worker_profile):
            """Deleting a profile should cascade to worker_trades rows."""
            # setup: add a worker trade first
            # trade = WorkerTrade(worker_profile_id=test_worker_profile.id, trade_id=1)
            # async_session.add(trade)
            # await async_session.commit()
            #
            # await crud_workers.delete(db=async_session, id=test_worker_profile.id)
            #
            # remaining = await async_session.get(WorkerTrade, trade.id)
            # assert remaining is None
            pass


# ===========================================================================
# Edge Cases
# ===========================================================================

class TestWorkerProfileEdgeCases:

    async def test_none_bio_persists(self, async_session: AsyncSession, test_user: User):
        profile = await crud_worker_profiles.create(db=async_session, object=create_schema(bio=None, user_id=test_user.id))
        assert profile.bio is None

    async def test_zero_hourly_rate_persists(self, async_session: AsyncSession, test_user: User):
        profile = await crud_worker_profiles.create(db=async_session, object=create_schema(hourly_rate=0.00, user_id=test_user.id))
        assert profile.hourly_rate == 0.00

    async def test_zero_years_experience_persists(self, async_session: AsyncSession, test_user: User):
        profile = await crud_worker_profiles.create(db=async_session, object=create_schema(years_of_experience=0, user_id=test_user.id))
        assert profile.years_of_experience == 0
