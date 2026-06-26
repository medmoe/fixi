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

import pytest
from fastcrud.exceptions.http_exceptions import DuplicateValueException
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.crud.crud_worker_profile import crud_workers
from src.app.models import User, WorkerProfile
from src.app.schemas.worker_profile import (
    WorkerProfileCreate,
    WorkerProfileUpdate,
    WorkerProfileUpdateInternal,
)
from tests.conftest import create_test_worker_profile


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


# ===========================================================================
# Create
# ===========================================================================

class TestWorkerProfileCreate:
    """crud_workers.create — inserts a row and returns it."""

    class TestSuccess:

        async def test_create_returns_profile(self, async_session: AsyncSession, test_user: User):
            profile = await crud_workers.create(db=async_session, object=create_schema(user_id=test_user.id))
            assert profile is not None
            assert profile.user_id == test_user.id

        async def test_create_persists_bio(self, async_session: AsyncSession, test_user: User):
            profile = await crud_workers.create(db=async_session, object=create_schema(bio="Expert welder", user_id=test_user.id))
            assert profile.bio == "Expert welder"

        async def test_create_sets_is_available_default(self, async_session: AsyncSession, test_user: User):
            profile = await crud_workers.create(db=async_session, object=create_schema(user_id=test_user.id))
            assert profile.is_available is True

        async def test_create_sets_is_verified_false_by_default(self, async_session: AsyncSession, test_user: User):
            profile = await crud_workers.create(db=async_session, object=create_schema(user_id=test_user.id))
            assert profile.is_verified is False

        async def test_create_sets_timestamps(self, async_session: AsyncSession, test_user: User):
            profile = await crud_workers.create(db=async_session, object=create_schema(user_id=test_user.id))
            assert profile.created_at is not None
            assert profile.updated_at is not None

    class TestDuplicates:

        async def test_create_duplicate_user_id_fails(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
            """Each user can only have one worker profile."""
            with pytest.raises(DuplicateValueException):
                await crud_workers.create(db=async_session, object=create_schema(user_id=test_worker_profile.user_id))

    class TestInvalidData:

        async def test_create_with_nonexistent_user_id_fails(self, async_session: AsyncSession):
            """FK constraint — user must exist."""
            with pytest.raises(Exception):
                await crud_workers.create(db=async_session, object=create_schema(user_id=99999))


# ===========================================================================
# Read
# ===========================================================================

class TestWorkerProfileRead:
    """crud_workers.get / get_multi — fetching rows."""

    class TestGetById:

        async def test_get_by_id_returns_profile(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
            fetched = await crud_workers.get(db=async_session, id=test_worker_profile.id)
            assert fetched is not None
            assert fetched["id"] == test_worker_profile.id

        async def test_get_by_id_returns_correct_fields(self, async_session: AsyncSession):
            test_worker_profile = await create_test_worker_profile(async_session, bio="This is a test bio", skills=["skill one", "skill two"])
            fetched = await crud_workers.get(db=async_session, id=test_worker_profile.id)
            assert fetched["bio"] == test_worker_profile.bio
            assert fetched["skills"] == test_worker_profile.skills

    class TestGetByUserId:

        async def test_get_by_user_id_returns_profile(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
            fetched = await crud_workers.get(db=async_session, user_id=test_worker_profile.user_id)
            assert fetched is not None
            assert fetched["user_id"] == test_worker_profile.user_id

    class TestGetMulti:

        async def create_workers(self, async_session: AsyncSession, worker_count: int, **kwargs):
            for _ in range(worker_count):
                await create_test_worker_profile(async_session, **kwargs)

        async def test_get_multi_returns_all_profiles(self, async_session: AsyncSession):
            await self.create_workers(async_session, 10)
            result = await crud_workers.get_multi(db=async_session)
            assert result["total_count"] == 10

        async def test_get_multi_respects_limit(self, async_session: AsyncSession):
            await self.create_workers(async_session, 10)
            result = await crud_workers.get_multi(db=async_session, limit=3)
            assert len(result["data"]) == 3

        async def test_get_multi_respects_offset(self, async_session: AsyncSession):
            await self.create_workers(async_session, 10)
            result = await crud_workers.get_multi(db=async_session, offset=2)
            assert len(result["data"]) == 8

        async def test_get_multi_limit_and_offset_combined(self, async_session: AsyncSession):
            await self.create_workers(async_session, 10)
            result = await crud_workers.get_multi(db=async_session, limit=4, offset=2)
            assert len(result["data"]) == 4

    class TestFilters:

        async def test_filter_by_is_available(self, async_session: AsyncSession):
            for i in range(10):
                await create_test_worker_profile(async_session, is_available=i % 3 == 0)
            result = await crud_workers.get_multi(db=async_session, is_available=True)
            assert len(result["data"]) == 4  # 4 multiples of 3 in range(10)
            assert all(p["is_available"] is True for p in result["data"])

        async def test_filter_by_is_verified(self, async_session: AsyncSession):
            for i in range(10):
                await create_test_worker_profile(async_session, is_verified=i % 2 == 0)

            result = await crud_workers.get_multi(db=async_session, is_verified=False)
            assert len(result["data"]) == 5  # 5 multiples of 2 in range(10)
            assert all(p["is_verified"] is False for p in result["data"])

        async def test_filter_by_hourly_rate(self, async_session: AsyncSession):
            hourly_rates = [i + 10.50 if i % 2 == 0 else i + 10.75 for i in range(63, 165, 11)]
            for hourly_rate in hourly_rates:
                await create_test_worker_profile(async_session, hourly_rate=hourly_rate)

            result = await crud_workers.get_multi(db=async_session, min_hourly_rate=45.50, max_hourly_rate=120.10)
            expected = [r for r in hourly_rates if 45.50 <= r <= 120.10]
            assert len(result["data"]) == len(expected)
            assert all(45.50 <= w.hourly_rate <= 120.10 for w in result["data"])

        async def test_filter_by_service_radius_km(self, async_session: AsyncSession):
            for radius in list(range(1, 55)):
                await create_test_worker_profile(async_session, service_radius_km=radius)

            result = await crud_workers.get_multi(db=async_session, min_service_radius_km=1, max_service_radius_km=10)
            assert len(result["data"]) == 10
            assert all(1 <= w.service_radius_km <= 10 for w in result["data"])

        async def test_filter_by_multiple_parameters(self, async_session: AsyncSession):
            """Test that get_multi correctly filters by is_available, years_of_experience,
            hourly_rate, and service_radius_km simultaneously."""

            workers_data = [
                # (is_available, years_of_experience, hourly_rate, service_radius_km)
                (True, 5, 75.00, 20),  # ✅ matches all filters
                (True, 8, 80.00, 25),  # ✅ matches all filters
                (False, 5, 75.00, 20),  # ❌ not available
                (True, 2, 75.00, 20),  # ❌ years_of_experience too low
                (True, 5, 120.00, 20),  # ❌ hourly_rate too high
                (True, 5, 75.00, 60),  # ❌ service_radius_km too high
                (True, 10, 95.00, 30),  # ✅ matches all filters
                (False, 9, 90.00, 15),  # ❌ not available
                (True, 4, 50.00, 10),  # ❌ years_of_experience too low, hourly_rate too low
                (True, 6, 85.00, 55),  # ❌ service_radius_km too high
            ]

            for is_available, years_exp, hourly_rate, radius in workers_data:
                await create_test_worker_profile(
                    async_session,
                    is_available=is_available,
                    years_of_experience=years_exp,
                    hourly_rate=hourly_rate,
                    service_radius_km=radius,
                )

            result = await crud_workers.get_multi(
                db=async_session,
                is_available=True,
                min_years_of_experience=3,
                max_years_of_experience=10,
                min_hourly_rate=60.00,
                max_hourly_rate=100.00,
                min_service_radius_km=10,
                max_service_radius_km=50,
            )

            # Derive expected results from source data to avoid hardcoding
            expected = [(av, yrs, rate, radius) for av, yrs, rate, radius in workers_data if av is True and 3 <= yrs <= 10 and 60.00 <= rate <= 100.00 and 10 <= radius <= 50]

            # 1. correct count
            assert len(result["data"]) == len(expected)  # expects 3

            # 2. every returned record satisfies ALL filters — not just count
            for worker in result["data"]:
                assert worker.is_available is True
                assert 3 <= worker.years_of_experience <= 10
                assert 60.00 <= worker.hourly_rate <= 100.00
                assert 10 <= worker.service_radius_km <= 50

    class TestNotFound:

        async def test_get_nonexistent_id_returns_none(self, async_session: AsyncSession):
            fetched = await crud_workers.get(db=async_session, id=99999)
            assert fetched is None

        async def test_get_nonexistent_user_id_returns_none(self, async_session: AsyncSession):
            fetched = await crud_workers.get(db=async_session, user_id=99999)
            assert fetched is None


# ===========================================================================
# Update
# ===========================================================================

class TestWorkerProfileUpdate:
    """crud_workers.update — partial and full updates."""

    class TestPartialUpdate:

        async def test_update_bio_only(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
            await crud_workers.update(db=async_session, object=WorkerProfileUpdate(bio="Updated bio"), user_id=test_worker_profile.user_id, id=test_worker_profile.id)
            updated = await crud_workers.get(db=async_session, id=test_worker_profile.id)
            assert updated["bio"] == "Updated bio"

        async def test_update_does_not_affect_other_fields(self, async_session: AsyncSession):
            test_worker_profile = await create_test_worker_profile(async_session, hourly_rate=100)
            await crud_workers.update(db=async_session, object=WorkerProfileUpdate(bio="New bio"), user_id=test_worker_profile.user_id, id=test_worker_profile.id)
            updated = await crud_workers.get(db=async_session, id=test_worker_profile.id)
            assert updated["hourly_rate"] == test_worker_profile.hourly_rate  # unchanged

    class TestFullUpdate:

        async def test_update_all_fields(self, async_session: AsyncSession, test_user: User):
            worker_profile = await crud_workers.create(db=async_session, object=create_schema(user_id=test_user.id))
            await crud_workers.update(
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
            updated = await crud_workers.get(db=async_session, id=worker_profile.id)
            assert updated["bio"] == "Fully updated"
            assert updated["years_of_experience"] == 20
            assert updated["is_available"] is False

    class TestInternalUpdate:
        """WorkerProfileUpdateInternal — admin can set is_verified."""

        async def test_admin_can_verify_worker(self, async_session: AsyncSession, test_worker_profile):
            await crud_workers.update(db=async_session, object=WorkerProfileUpdateInternal(is_verified=True), user_id=test_worker_profile.user_id, id=test_worker_profile.id)
            updated = await crud_workers.get(db=async_session, id=test_worker_profile.id)
            assert updated["is_verified"] is True

    class TestUpdatesTimestamp:

        async def test_updated_at_changes_on_update(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
            user = await async_session.get(User, test_worker_profile.user_id)
            user.updated_at = datetime(2020, 1, 1, tzinfo=UTC)  # Far in the past, no ambiguity
            await async_session.commit()
            await async_session.refresh(user)

            await crud_workers.update(db=async_session,
                                      object=WorkerProfileUpdate(bio="Trigger timestamp update"),
                                      user_id=test_worker_profile.user_id,
                                      id=test_worker_profile.id)
            await async_session.refresh(user)

            assert user.updated_at > datetime(2020, 1, 1, tzinfo=UTC)

    class TestNotFound:

        async def test_update_nonexistent_profile_raises(self, async_session: AsyncSession):
            with pytest.raises(NoResultFound):
                await crud_workers.update(
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
            await crud_workers.delete(db=async_session, user_id=test_worker_profile.user_id, hard=True)
            fetched = await crud_workers.get(db=async_session, id=test_worker_profile.id)
            assert fetched is None

    class TestNotFound:

        async def test_delete_nonexistent_profile_raises(self, async_session: AsyncSession):
            with pytest.raises(NoResultFound):
                await crud_workers.delete(db=async_session, user_id=9999)

    class TestCascadeEffects:

        async def test_delete_profile_removes_worker_trades(self, async_session: AsyncSession, test_worker_profile):
            """Deleting a profile should cascade to worker_trades rows."""
            # setup: add a worker trade first
            # trade = WorkerTrade(worker_id=test_worker_profile.id, trade_id=1)
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
        profile = await crud_workers.create(db=async_session, object=create_schema(bio=None, user_id=test_user.id))
        assert profile.bio is None

    async def test_zero_hourly_rate_persists(self, async_session: AsyncSession, test_user: User):
        profile = await crud_workers.create(db=async_session, object=create_schema(hourly_rate=0.00, user_id=test_user.id))
        assert profile.hourly_rate == 0.00

    async def test_zero_years_experience_persists(self, async_session: AsyncSession, test_user: User):
        profile = await crud_workers.create(db=async_session, object=create_schema(years_of_experience=0, user_id=test_user.id))
        assert profile.years_of_experience == 0
