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

import pytest
from fastcrud.exceptions.http_exceptions import DuplicateValueException, NotFoundException
from sqlalchemy.ext.asyncio import AsyncSession

from models import WorkerProfile
from src.app.crud.crud_worker_profile import crud_workers
from src.app.models.user import User
from src.app.schemas.worker_profile import (
    WorkerProfileCreate,
    WorkerProfileUpdate,
    WorkerProfileUpdateInternal,
)
from tests.conftest import create_test_worker_profile


# ===========================================================================
# Fixtures & Factories
# ===========================================================================

def create_schema(**overrides) -> WorkerProfileCreate:
    """Valid WorkerProfileCreate schema — override any field to test edge cases."""
    return WorkerProfileCreate(
        bio="Experienced plumber with 10 years of experience.",
        years_of_experience=10,
        hourly_rate=75.00,
        service_radius_km=20,
        is_available=True,
        skills=["plumbing", "pipe repair"],
        portfolio_image_urls=["https://example.com/portfolio1.jpg"],
        **overrides,
    )


# ===========================================================================
# Create
# ===========================================================================

class TestWorkerProfileCreate:
    """crud_workers.create — inserts a row and returns it."""

    class TestSuccess:

        async def test_create_returns_profile(self, async_session: AsyncSession, test_user: User):
            profile = await crud_workers.create(
                db=async_session,
                object=create_schema(),
                user_id=test_user.id,
            )
            assert profile is not None
            assert profile.user_id == test_user.id

        async def test_create_persists_bio(self, async_session: AsyncSession, test_user: User):
            profile = await crud_workers.create(
                db=async_session,
                object=create_schema(bio="Expert welder"),
                user_id=test_user.id,
            )
            assert profile.bio == "Expert welder"

        async def test_create_persists_skills(self, async_session: AsyncSession, test_user: User):
            profile = await crud_workers.create(
                db=async_session,
                object=create_schema(skills=["welding", "cutting"]),
                user_id=test_user.id,
            )
            assert profile.skills == ["welding", "cutting"]

        async def test_create_sets_is_available_default(self, async_session: AsyncSession, test_user: User):
            profile = await crud_workers.create(
                db=async_session,
                object=create_schema(),
                user_id=test_user.id,
            )
            assert profile.is_available is True

        async def test_create_sets_is_verified_false_by_default(self, async_session: AsyncSession, test_user: User):
            profile = await crud_workers.create(
                db=async_session,
                object=create_schema(),
                user_id=test_user.id,
            )
            assert profile.is_verified is False

        async def test_create_sets_timestamps(self, async_session: AsyncSession, test_user: User):
            profile = await crud_workers.create(
                db=async_session,
                object=create_schema(),
                user_id=test_user.id,
            )
            assert profile.created_at is not None
            assert profile.updated_at is not None

    class TestDuplicates:

        async def test_create_duplicate_user_id_fails(self, async_session: AsyncSession, test_user: User):
            """Each user can only have one worker profile."""
            with pytest.raises(DuplicateValueException):
                await crud_workers.create(
                    db=async_session,
                    object=create_schema(),
                    user_id=test_user.id,
                )

    class TestInvalidData:

        async def test_create_with_nonexistent_user_id_fails(self, async_session: AsyncSession):
            """FK constraint — user must exist."""
            with pytest.raises(Exception):
                await crud_workers.create(
                    db=async_session,
                    object=create_schema(),
                    user_id=99999,
                )


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

        async def test_get_multi_returns_all_profiles(self, async_session: AsyncSession, test_user: User, other_user: User):
            await crud_workers.create(db=async_session, object=create_schema(), user_id=test_user.id)
            await crud_workers.create(db=async_session, object=create_schema(), user_id=other_user.id)

            result = await crud_workers.get_multi(db=async_session)
            assert result["total_count"] == 2

        async def test_get_multi_respects_limit(self, async_session: AsyncSession, test_user: User, other_user: User):
            await crud_workers.create(db=async_session, object=create_schema(), user_id=test_user.id)
            await crud_workers.create(db=async_session, object=create_schema(), user_id=other_user.id)

            result = await crud_workers.get_multi(db=async_session, limit=1)
            assert len(result["data"]) == 1

        async def test_get_multi_respects_offset(self, async_session: AsyncSession, test_user: User, other_user: User):
            await crud_workers.create(db=async_session, object=create_schema(), user_id=test_user.id)
            await crud_workers.create(db=async_session, object=create_schema(), user_id=other_user.id)

            result = await crud_workers.get_multi(db=async_session, offset=1)
            assert len(result["data"]) == 1

    class TestFilters:

        async def test_filter_by_is_available(self, async_session: AsyncSession, test_user: User, other_user: User):
            await crud_workers.create(db=async_session, object=create_schema(is_available=True), user_id=test_user.id)
            await crud_workers.create(db=async_session, object=create_schema(is_available=False), user_id=other_user.id)

            result = await crud_workers.get_multi(db=async_session, is_available=True)
            assert all(p["is_available"] is True for p in result["data"])

        async def test_filter_by_is_verified(self, async_session: AsyncSession):
            for i in range(10):
                await create_test_worker_profile(async_session, is_verified= i % 2 == 0)

            result = await crud_workers.get_multi(db=async_session, is_verified=False)
            assert len(result["data"]) == 5
            assert all(p["is_verified"] is False for p in result["data"])

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

        async def test_update_bio_only(
                self, async_session: AsyncSession, worker_profile
        ):
            await crud_workers.update(
                db=async_session,
                object=WorkerProfileUpdate(bio="Updated bio"),
                id=worker_profile.id,
            )
            updated = await crud_workers.get(db=async_session, id=worker_profile.id)
            assert updated["bio"] == "Updated bio"

        async def test_update_does_not_affect_other_fields(
                self, async_session: AsyncSession, worker_profile
        ):
            original_skills = worker_profile.skills
            await crud_workers.update(
                db=async_session,
                object=WorkerProfileUpdate(bio="New bio"),
                id=worker_profile.id,
            )
            updated = await crud_workers.get(db=async_session, id=worker_profile.id)
            assert updated["skills"] == original_skills  # unchanged

    class TestFullUpdate:

        async def test_update_all_fields(
                self, async_session: AsyncSession, worker_profile
        ):
            await crud_workers.update(
                db=async_session,
                object=WorkerProfileUpdate(
                    bio="Fully updated",
                    years_of_experience=20,
                    hourly_rate=100.00,
                    service_radius_km=50,
                    is_available=False,
                    skills=["new skill"],
                ),
                id=worker_profile.id,
            )
            updated = await crud_workers.get(db=async_session, id=worker_profile.id)
            assert updated["bio"] == "Fully updated"
            assert updated["years_of_experience"] == 20
            assert updated["is_available"] is False

    class TestInternalUpdate:
        """WorkerProfileUpdateInternal — admin can set is_verified."""

        async def test_admin_can_verify_worker(
                self, async_session: AsyncSession, worker_profile
        ):
            await crud_workers.update(
                db=async_session,
                object=WorkerProfileUpdateInternal(is_verified=True),
                id=worker_profile.id,
            )
            updated = await crud_workers.get(db=async_session, id=worker_profile.id)
            assert updated["is_verified"] is True

    class TestUpdatesTimestamp:

        async def test_updated_at_changes_on_update(
                self, async_session: AsyncSession, worker_profile
        ):
            original_updated_at = worker_profile.updated_at
            await crud_workers.update(
                db=async_session,
                object=WorkerProfileUpdate(bio="Trigger timestamp update"),
                id=worker_profile.id,
            )
            updated = await crud_workers.get(db=async_session, id=worker_profile.id)
            assert updated["updated_at"] > original_updated_at

    class TestNotFound:

        async def test_update_nonexistent_profile_raises(self, async_session: AsyncSession):
            with pytest.raises(NotFoundException):
                await crud_workers.update(
                    db=async_session,
                    object=WorkerProfileUpdate(bio="Ghost update"),
                    id=99999,
                )


# ===========================================================================
# Delete
# ===========================================================================

class TestWorkerProfileDelete:
    """crud_workers.delete — hard delete."""

    class TestSuccess:

        async def test_delete_removes_profile(
                self, async_session: AsyncSession, worker_profile
        ):
            await crud_workers.delete(db=async_session, id=worker_profile.id)
            fetched = await crud_workers.get(db=async_session, id=worker_profile.id)
            assert fetched is None

        async def test_delete_returns_confirmation(
                self, async_session: AsyncSession, worker_profile
        ):
            result = await crud_workers.delete(db=async_session, id=worker_profile.id)
            assert result is not None

    class TestNotFound:

        async def test_delete_nonexistent_profile_raises(self, async_session: AsyncSession):
            with pytest.raises(NotFoundException):
                await crud_workers.delete(db=async_session, id=99999)

    class TestCascadeEffects:

        async def test_delete_profile_removes_worker_trades(
                self, async_session: AsyncSession, worker_profile, async_session
        ):
            """Deleting a profile should cascade to worker_trades rows."""
            # setup: add a worker trade first
            trade = WorkerTrade(worker_id=worker_profile.id, trade_id=1)
            async_session.add(trade)
            await async_session.commit()

            await crud_workers.delete(db=async_session, id=worker_profile.id)

            remaining = await async_session.get(WorkerTrade, trade.id)
            assert remaining is None


# ===========================================================================
# Edge Cases
# ===========================================================================

class TestWorkerProfileEdgeCases:

    async def test_empty_skills_list_persists(self, async_session: AsyncSession, user: User):
        profile = await crud_workers.create(
            db=async_session,
            object=create_schema(skills=[]),
            user_id=user.id,
        )
        assert profile.skills == []

    async def test_none_bio_persists(self, async_session: AsyncSession, user: User):
        profile = await crud_workers.create(
            db=async_session,
            object=create_schema(bio=None),
            user_id=user.id,
        )
        assert profile.bio is None

    async def test_zero_hourly_rate_persists(self, async_session: AsyncSession, user: User):
        profile = await crud_workers.create(
            db=async_session,
            object=create_schema(hourly_rate=0.00),
            user_id=user.id,
        )
        assert profile.hourly_rate == 0.00

    async def test_zero_years_experience_persists(self, async_session: AsyncSession, user: User):
        profile = await crud_workers.create(
            db=async_session,
            object=create_schema(years_of_experience=0),
            user_id=user.id,
        )
        assert profile.years_of_experience == 0
