import pytest
from sqlalchemy.exc import IntegrityError

from src.app.models.user import User
from src.app.models.worker_profile import WorkerProfile


class TestWorkerModel:
    """Test Worker model."""

    @pytest.mark.asyncio
    async def test_create_worker_with_all_fields(self, async_session):
        """Test creating a worker with all fields."""

        # Create a user first
        user = User(
            name="Test User",
            username="testuser",
            email="test@example.com",
            hashed_password="hashed_password",
        )
        async_session.add(user)
        await async_session.commit()
        await async_session.refresh(user)

        # Create worker
        worker = WorkerProfile(
            user_id=user.id,
            hourly_rate=75.0,
            years_of_experience=10,
            bio="Experienced plumber",
        )
        async_session.add(worker)
        await async_session.commit()
        await async_session.refresh(worker)

        assert worker.id is not None
        assert worker.user_id == user.id
        assert worker.hourly_rate == 75.0
        assert worker.years_of_experience == 10
        assert worker.bio == "Experienced plumber"
        assert worker.is_verified is False

    @pytest.mark.asyncio
    async def test_create_worker_with_minimum_fields(self, async_session):
        """Test creating a worker with only required fields."""

        user = User(
            name="Test User",
            username="testuser2",
            email="test2@example.com",
            hashed_password="hashed_password",
        )
        async_session.add(user)
        await async_session.commit()
        await async_session.refresh(user)

        worker = WorkerProfile(
            user_id=user.id,
        )
        async_session.add(worker)
        await async_session.commit()
        await async_session.refresh(worker)

        assert worker.id is not None
        assert worker.years_of_experience is None
        assert worker.bio is None

    @pytest.mark.asyncio
    async def test_worker_unique_user_id_constraint(self, async_session):
        """Test that a user can only have one worker profile."""

        user = User(
            name="Test User",
            username="testuser3",
            email="test3@example.com",
            hashed_password="hashed_password",
        )
        async_session.add(user)
        await async_session.commit()
        await async_session.refresh(user)

        # Create first worker
        worker1 = WorkerProfile(
            user_id=user.id,
        )
        async_session.add(worker1)
        await async_session.commit()

        # Try to create second worker for same user
        worker2 = WorkerProfile(
            user_id=user.id,
        )
        async_session.add(worker2)

        with pytest.raises(IntegrityError):
            await async_session.commit()

    @pytest.mark.asyncio
    async def test_worker_cascade_delete(self, async_session):
        """Test that deleting a user deletes their worker profile."""
        from src.app.models.user import User
        from sqlalchemy import select

        user = User(
            name="Test User",
            username="testuser4",
            email="test4@example.com",
            hashed_password="hashed_password",
        )
        async_session.add(user)
        await async_session.commit()
        await async_session.refresh(user)

        worker = WorkerProfile(
            user_id=user.id,
        )
        async_session.add(worker)
        await async_session.commit()
        worker_id = worker.id

        # Delete user
        await async_session.delete(user)
        await async_session.commit()

        # Verify worker is also deleted
        result = await async_session.execute(
            select(WorkerProfile).where(WorkerProfile.id == worker_id)
        )
        deleted_worker = result.scalar_one_or_none()
        assert deleted_worker is None

    @pytest.mark.asyncio
    async def test_worker_rating_fields(self, async_session):
        """Test worker rating fields."""

        user = User(
            name="Test User",
            username="testuser5",
            email="test5@example.com",
            hashed_password="hashed_password",
        )
        async_session.add(user)
        await async_session.commit()
        await async_session.refresh(user)

        worker = WorkerProfile(
            user_id=user.id,
        )
        async_session.add(worker)
        await async_session.commit()
        await async_session.refresh(worker)

        # Update rating
        worker.average_rating = 4.5
        worker.total_rating = 10
        await async_session.commit()
        await async_session.refresh(worker)

        assert worker.average_rating == 4.5
        assert worker.total_rating == 10
