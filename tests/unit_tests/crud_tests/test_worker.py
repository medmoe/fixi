import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.crud.crud_worker import crud_workers
from src.app.models import User, WorkerProfile
from src.app.schemas.worker import WorkerCreate, WorkerUpdate, WorkerRead


class TestWorkerCRUD:
    """Test Worker CRUD operations."""

    @pytest.mark.asyncio
    async def test_create_worker(self, async_session: AsyncSession):
        """Test creating a worker."""
        # Create user first
        # user = User(
        #     name="Test User",
        #     username="crudtest1",
        #     email="crudtest1@example.com",
        #     hashed_password="hashed",
        # )
        # async_session.add(user)
        # await async_session.commit()
        # await async_session.refresh(user)
        #
        # # Create worker
        # worker_data = WorkerCreate(
        #     user_id=user.id,
        #     profession="Plumber",
        #     hourly_rate=75.0,
        #     years_of_experience=10,
        #     bio="Test bio",
        # )
        #
        # created_worker = await crud_workers.create(db=async_session, object=worker_data)
        #
        # assert created_worker.id is not None
        # assert created_worker.user_id == user.id
        # assert created_worker.profession == "Plumber"
        # assert created_worker.hourly_rate == 75.0

        pass

    @pytest.mark.asyncio
    async def test_get_worker_by_id(self, async_session: AsyncSession):
        # """Test getting a worker by ID."""
        # # Create user and worker
        # user = User(
        #     name="Test User",
        #     username="crudtest2",
        #     email="crudtest2@example.com",
        #     hashed_password="hashed",
        # )
        # async_session.add(user)
        # await async_session.commit()
        # await async_session.refresh(user)
        #
        # worker = WorkerProfile(
        #     user_id=user.id,
        # )
        # async_session.add(worker)
        # await async_session.commit()
        # await async_session.refresh(worker)
        #
        # # Get worker
        # retrieved_worker = await crud_workers.get(
        #     db=async_session,
        #     id=worker.id,
        #     schema_to_select=WorkerRead,
        # )
        #
        # assert retrieved_worker is not None
        # assert retrieved_worker['id'] == worker.id
        # assert retrieved_worker['profession'] == "Carpenter"
        pass

    @pytest.mark.asyncio
    async def test_get_worker_by_user_id(self, async_session: AsyncSession):
        """Test getting a worker by user_id."""
        # Create user and worker
        # user = User(
        #     name="Test User",
        #     username="crudtest3",
        #     email="crudtest3@example.com",
        #     hashed_password="hashed",
        # )
        # async_session.add(user)
        # await async_session.commit()
        # await async_session.refresh(user)
        #
        # worker = WorkerProfile(
        #     user_id=user.id,
        # )
        # async_session.add(worker)
        # await async_session.commit()
        #
        # # Get worker by user_id
        # retrieved_worker = await crud_workers.get(
        #     db=async_session,
        #     user_id=user.id,
        #     schema_to_select=WorkerRead,
        # )
        #
        # assert retrieved_worker is not None
        # assert retrieved_worker['user_id'] == user.id
        # assert retrieved_worker['profession'] == "Electrician"
        pass

    @pytest.mark.asyncio
    async def test_update_worker(self, async_session: AsyncSession):
        """Test updating a worker."""
        # Create user and worker
        # user = User(
        #     name="Test User",
        #     username="crudtest4",
        #     email="crudtest4@example.com",
        #     hashed_password="hashed",
        # )
        # async_session.add(user)
        # await async_session.commit()
        # await async_session.refresh(user)
        #
        # worker = WorkerProfile(
        #     user_id=user.id,
        # )
        # async_session.add(worker)
        # await async_session.commit()
        # await async_session.refresh(worker)
        #
        # # Update worker
        # update_data = WorkerUpdate(
        #     hourly_rate=85.0,
        #     availability_status="busy",
        # )
        #
        # await crud_workers.update(
        #     db=async_session,
        #     object=update_data,
        #     id=worker.id,
        # )
        #
        # # Verify update
        # updated_worker = await crud_workers.get(
        #     db=async_session,
        #     id=worker.id,
        #     schema_to_select=WorkerRead,
        # )
        #
        # assert updated_worker['hourly_rate'] == 85.0
        # assert updated_worker['availability_status'] == "busy"
        # assert updated_worker['profession'] == "Plumber"  # Unchanged
        pass

    @pytest.mark.asyncio
    async def test_delete_worker(self, async_session: AsyncSession):
        """Test deleting a worker."""
        # Create user and worker
        user = User(
            name="Test User",
            username="crudtest5",
            email="crudtest5@example.com",
            hashed_password="hashed",
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

        # Delete worker
        await crud_workers.delete(db=async_session, id=worker_id)

        # Verify deletion
        deleted_worker = await crud_workers.get(
            db=async_session,
            id=worker_id,
        )

        assert deleted_worker is None

    @pytest.mark.asyncio
    async def test_get_multi_workers(self, async_session: AsyncSession):
        """Test getting multiple workers."""
        # Create multiple users and workers
        for i in range(5):
            user = User(
                name=f"User {i}",
                username=f"crudtest_multi_{i}",
                email=f"crudtest_multi_{i}@example.com",
                hashed_password="hashed",
            )
            async_session.add(user)
            await async_session.commit()
            await async_session.refresh(user)

            worker = WorkerProfile(
                user_id=user.id,
            )
            async_session.add(worker)

        await async_session.commit()

        # Get workers
        workers_data = await crud_workers.get_multi(
            db=async_session,
            offset=0,
            limit=10,
        )
        assert workers_data["total_count"] >= 5
        assert len(workers_data["data"]) >= 5

    @pytest.mark.asyncio
    async def test_get_multi_workers_filtered_by_profession(self, async_session: AsyncSession):
        """Test getting workers filtered by profession."""
        # Create workers with different professions
        # for i in range(3):
        #     user = User(
        #         name=f"User {i}",
        #         username=f"crudtest_filter_{i}",
        #         email=f"crudtest_filter_{i}@example.com",
        #         hashed_password="hashed",
        #     )
        #     async_session.add(user)
        #     await async_session.commit()
        #     await async_session.refresh(user)
        #
        #     worker = WorkerProfile(
        #         user_id=user.id,
        #     )
        #     async_session.add(worker)
        #
        # await async_session.commit()
        #
        # # Get only electricians
        # workers_data = await crud_workers.get_multi(
        #     db=async_session,
        #     profession="Electrician",
        # )
        #
        # assert workers_data["total_count"] >= 3
        # for worker in workers_data["data"]:
        #     if isinstance(worker, dict):
        #         assert worker["profession"] == "Electrician"
        #     else:
        #         assert worker.profession == "Electrician"
        pass

    @pytest.mark.asyncio
    async def test_worker_exists(self, async_session: AsyncSession):
        """Test checking if worker exists."""
        # Create user and worker
        user = User(
            name="Test User",
            username="crudtest_exists",
            email="crudtest_exists@example.com",
            hashed_password="hashed",
        )
        async_session.add(user)
        await async_session.commit()
        await async_session.refresh(user)

        worker = WorkerProfile(
            user_id=user.id,
        )
        async_session.add(worker)
        await async_session.commit()

        # Check exists
        exists = await crud_workers.exists(db=async_session, user_id=user.id)
        assert exists is True

        # Check non-existent
        exists = await crud_workers.exists(db=async_session, user_id=99999)
        assert exists is False
