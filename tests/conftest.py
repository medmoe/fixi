from datetime import datetime, UTC
from io import BytesIO
from typing import AsyncGenerator
from unittest.mock import Mock, AsyncMock

import pytest
import pytest_asyncio
from PIL import Image
from faker import Faker
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text, insert, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from uuid6 import uuid7

from src.app.core.config import settings
from src.app.core.db.database import Base, async_get_db
from src.app.core.security import get_password_hash
from src.app.core.utils import cache as cache_module
from src.app.main import app
from src.app.models import User, UserRole, WorkerProfile

fake = Faker()

DATABASE_URI = settings.TEST_POSTGRES_ASYNC_URI
DATABASE_PREFIX = settings.TEST_POSTGRES_ASYNC_PREFIX
DATABASE_URL = settings.TEST_POSTGRES_URL or f"{DATABASE_PREFIX}{DATABASE_URI}"

# Create test engine and session
test_engine = create_async_engine(DATABASE_URL, echo=False, poolclass=NullPool, future=True)
testSessionLocal = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)


@pytest_asyncio.fixture(scope="function")
async def async_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status_type') THEN
                        CREATE TYPE job_status_type AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
                    END IF;
                END
                $$;
                """
            )
        )

        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with testSessionLocal() as session:
        try:
            yield session
        finally:
            await session.rollback()
            await session.close()

    await test_engine.dispose()


@pytest_asyncio.fixture
async def async_client(async_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create an async HTTP client for testing."""

    # Override dependency to use test DB
    def get_test_db():
        return async_session

    app.dependency_overrides[async_get_db] = get_test_db

    # Use ASGI transport so it uses the app in-memory
    async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(async_session: AsyncSession) -> User:
    return await create_test_user(async_session)


@pytest_asyncio.fixture
async def test_admin_user(async_session: AsyncSession) -> User:
    return await create_test_user(async_session, is_superuser=True)


@pytest_asyncio.fixture
async def other_user(async_session: AsyncSession) -> User:
    return await create_test_user(async_session)


@pytest_asyncio.fixture
async def test_worker_profile(async_session: AsyncSession) -> WorkerProfile:
    return await create_test_worker_profile(async_session)


@pytest_asyncio.fixture
async def auth_headers(async_client: AsyncClient, test_user: User) -> dict:
    """ Get authentication headers for a test user."""
    login_data = {
        "username": test_user.username,
        "password": "testpassword123"
    }
    response = await async_client.post("/api/v1/login", data=login_data)
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest_asyncio.fixture
async def other_auth_headers(async_client: AsyncClient, other_user: User) -> dict:
    """ Get authentication headers for a test user."""
    login_data = {
        "username": other_user.username,
        "password": "testpassword123"
    }
    response = await async_client.post("/api/v1/login", data=login_data)
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest_asyncio.fixture
async def admin_auth_headers(async_client: AsyncClient, test_admin_user: User) -> dict:
    """ Get authentication headers for a test user."""
    login_data = {
        "username": test_admin_user.username,
        "password": "testpassword123"
    }

    response = await async_client.post("/api/v1/login", data=login_data)
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def sample_image_bytes(width: int = 100, height: int = 100, image_format: str = "PNG") -> bytes:
    """ Generate a sample image in bytes. """
    # Create a simple image
    image = Image.new('RGB', (width, height), color='red')

    # Save to bytes buffer
    buffer = BytesIO()
    image.save(buffer, format=image_format)
    buffer.seek(0)

    return buffer.getvalue()


@pytest.fixture
def sample_invalid_image_bytes():
    # Create a valid small image first
    img = Image.new('RGB', (100, 100), color='red')
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    data = bytearray(buffer.getvalue())

    # Keep header intact, but corrupt middle content (e.g., in IDAT chunk)
    mid = len(data) // 2
    data[mid:mid + 20] = b"\x00" * 20  # zero out 20 bytes in the middle
    return bytes(data)


@pytest.fixture
async def cleanup_minio_bucket():
    """
    Test-scoped fixture
    - yields to the test
    - after the test finishes, deletes all objects in the uploads bucket
    """
    # run the test
    yield
    from src.app.services.minio_client import minio_client

    # teardown phase:
    bucket = minio_client.bucket_uploads
    resp = minio_client.client.list_objects_v2(Bucket=bucket)

    contents = resp.get("Contents", [])
    if not contents:
        return

    objects_to_delete = [{"Key": obj["Key"]} for obj in contents]
    minio_client.client.delete_objects(
        Bucket=bucket,
        Delete={"Objects": objects_to_delete}
    )


async def create_test_user(async_session: AsyncSession, **kwargs) -> User:
    """Create a test user."""
    user = User(
        name=fake.name(),
        username=fake.user_name(),
        email=fake.email(),
        hashed_password=get_password_hash("testpassword123"),
        **kwargs
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


async def create_test_worker_profile(async_session: AsyncSession, **kwargs) -> WorkerProfile:
    """ Create a test worker """
    user = User(name=fake.name(), username=fake.user_name(), email=fake.email(),
                hashed_password=get_password_hash("testpassword123"), is_superuser=False)
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    worker = WorkerProfile(user_id=user.id, **kwargs)
    async_session.add(worker)
    await async_session.commit()
    await async_session.refresh(worker)
    return worker


async def create_bulk_test_worker_profiles(async_session: AsyncSession, parameters: list[dict]) -> list[WorkerProfile]:
    size = len(parameters)

    # create users
    user_rows = [
        {
            "name": fake.name(),
            "username": fake.user_name(),
            "email": fake.email(),
            "hashed_password": get_password_hash("testpassword123"),
            "is_superuser": False,
            "uuid": uuid7(),
            "created_at": datetime.now(UTC),
            "role_type": UserRole.WORKER,
        }
        for _ in range(size)
    ]
    await async_session.execute(insert(User), user_rows)
    await async_session.flush()  # flush so IDs are assigned, no commit yet

    # fetch only the users we just created
    emails = [row["email"] for row in user_rows]
    result = await async_session.execute(
        select(User).where(User.email.in_(emails))
    )
    users: list[User] = result.scalars().all()

    # create worker profiles
    worker_rows = [
        {"user_id": user.id, **param}
        for param, user in zip(parameters, users)
    ]
    await async_session.execute(insert(WorkerProfile), worker_rows)
    await async_session.commit()  # single commit for everything ✅

    # fetch only the worker profiles we just created
    user_ids = [user.id for user in users]
    result = await async_session.execute(
        select(WorkerProfile).where(WorkerProfile.user_id.in_(user_ids))
    )
    workers: list[WorkerProfile] = result.scalars().all()
    return workers


#
#
# @pytest.fixture(scope="session")
# def client() -> Generator[TestClient, Any, None]:
#     with TestClient(app) as _client:
#         yield _client
#     app.dependency_overrides = {}
#     sync_engine.dispose()
#
#
# @pytest.fixture
# def db() -> Generator[Session, Any, None]:
#     session = local_session()
#     yield session
#     session.close()
#
#
# def override_dependency(dependency: Callable[..., Any], mocked_response: Any) -> None:
#     app.dependency_overrides[dependency] = lambda: mocked_response
#
#
# @pytest.fixture
# def mock_db():
#     """Mock database session for unit tests."""
#     return Mock(spec=AsyncSession)
#
#
@pytest.fixture
def mock_redis():
    """Mock Redis connection for unit tests."""
    mock_redis = Mock()
    mock_redis.get = AsyncMock(return_value=None)
    mock_redis.set = AsyncMock(return_value=True)
    mock_redis.delete = AsyncMock(return_value=True)
    mock_redis.expire = AsyncMock(return_value=True)
    mock_redis.scan = AsyncMock(return_value=(0, []))
    return mock_redis


@pytest.fixture(autouse=True)
def setup_mock_redis(mock_redis, monkeypatch):
    """ Automatically setup mock Redis for all tests. """
    monkeypatch.setattr(cache_module, "client", mock_redis)
    yield

    # Cleanup
    monkeypatch.setattr(cache_module, "client", None)


#
#
@pytest.fixture
def sample_user_data():
    """Generate sample user data for tests."""
    return {
        "name": fake.name(),
        "username": fake.user_name(),
        "email": fake.email(),
        "password": fake.password(),
    }


@pytest.fixture
def sample_user_read():
    """Generate a sample UserRead object."""
    from uuid6 import uuid7

    from src.app.schemas.user import UserRead

    return UserRead(
        id=1,
        uuid=uuid7(),
        name=fake.name(),
        username=fake.user_name(),
        email=fake.email(),
        profile_image_url=fake.image_url(),
        is_superuser=False,
        created_at=fake.date_time(),
        updated_at=fake.date_time(),
        tier_id=None,
    )


@pytest.fixture
def current_user_dict():
    """Mock current user from auth dependency."""
    return {
        "id": 1,
        "username": fake.user_name(),
        "email": fake.email(),
        "name": fake.name(),
        "is_superuser": False,
    }

