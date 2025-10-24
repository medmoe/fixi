from typing import AsyncGenerator

import pytest_asyncio
from faker import Faker
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from src.app.core.config import settings
from src.app.core.db.database import Base, async_get_db
from src.app.core.security import get_password_hash
from src.app.main import app
from src.app.models.user import User

fake = Faker()

DATABASE_URI = settings.POSTGRES_URI
DATABASE_PREFIX = settings.POSTGRES_ASYNC_PREFIX

# Create test engine and session
test_engine = create_async_engine(DATABASE_PREFIX + DATABASE_URI, echo=False, poolclass=NullPool, future=True)
testSessionLocal = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)


@pytest_asyncio.fixture
async def async_session() -> AsyncGenerator[AsyncSession, None]:
    """ Create a fresh database session for each test. """

    # Create fresh engine for each test - this is crucial!
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with testSessionLocal() as session:
        try:
            yield session
        finally:
            session.close()
    # Cleanup engine
    await test_engine.dispose()


@pytest_asyncio.fixture
async def async_client(async_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """ Create an async HTTP client for testing """

    def get_test_db():
        return async_session

    app.dependency_overrides[async_get_db] = get_test_db

    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(async_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        name=fake.name(),
        username=fake.user_name(),
        email=fake.email(),
        hashed_password=get_password_hash("testpassword123"),
        is_superuser=False
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(async_client: AsyncClient, test_user: User) -> dict:
    """ Get authentication headers for a test user."""
    login_data = {
        "username": test_user.username,
        "password": "testpassword123"
    }
    response = await async_client.post("/api/v1/auth/login", data=login_data)
    return {"Authorization": f"Bearer {response.json()['access_token']}"}

# from collections.abc import Callable, Generator
# from typing import Any, List, Dict
# from unittest.mock import AsyncMock, Mock
#
# import pytest
# from faker import Faker
# from fastapi.testclient import TestClient
# from sqlalchemy import create_engine
# from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy.orm import sessionmaker
# from sqlalchemy.orm.session import Session
#
# from src.app.core.config import settings
# from src.app.main import app
#
# DATABASE_URI = settings.POSTGRES_URI
# DATABASE_PREFIX = settings.POSTGRES_SYNC_PREFIX
#
# sync_engine = create_engine(DATABASE_PREFIX + DATABASE_URI)
# local_session = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine, expire_on_commit=False)
#
# fake = Faker()
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
# @pytest.fixture
# def mock_redis():
#     """Mock Redis connection for unit tests."""
#     mock_redis = Mock()
#     mock_redis.get = AsyncMock(return_value=None)
#     mock_redis.set = AsyncMock(return_value=True)
#     mock_redis.delete = AsyncMock(return_value=True)
#     return mock_redis
#
#
# @pytest.fixture
# def sample_user_data():
#     """Generate sample user data for tests."""
#     return {
#         "name": fake.name(),
#         "username": fake.user_name(),
#         "email": fake.email(),
#         "password": fake.password(),
#     }
#
#
# @pytest.fixture
# def sample_user_read():
#     """Generate a sample UserRead object."""
#     from uuid6 import uuid7
#
#     from src.app.schemas.user import UserRead
#
#     return UserRead(
#         id=1,
#         uuid=uuid7(),
#         name=fake.name(),
#         username=fake.user_name(),
#         email=fake.email(),
#         profile_image_url=fake.image_url(),
#         is_superuser=False,
#         created_at=fake.date_time(),
#         updated_at=fake.date_time(),
#         tier_id=None,
#     )
#
#
# @pytest.fixture
# def current_user_dict():
#     """Mock current user from auth dependency."""
#     return {
#         "id": 1,
#         "username": fake.user_name(),
#         "email": fake.email(),
#         "name": fake.name(),
#         "is_superuser": False,
#     }
#
#
# @pytest.fixture
# def sample_file_data(current_user_dict: dict[str, Any] = None):
#     """Generate sample file data for tests."""
#     return {
#         "file_key": "uploads/123e4567-e89b-12d3-a456-426614174000_myphoto.png",
#         "original_filename": "myphoto.png",
#         "mime_type": "image/png",
#         "file_size": 1000,
#     }
#
#
# @pytest.fixture
# def sample_file_data_list() -> List[Dict[str, Any]]:
#     """Generate a list of sample file metadata dictionaries for tests."""
#     return [
#         {
#             "file_key": f"uploads/{fake.uuid4()}_{fake.file_name(extension='png')}",
#             "original_filename": fake.file_name(extension="png"),
#             "mime_type": "image/png",
#             "file_size": fake.random_int(min=100, max=5_000_000),
#             "uploaded_at": fake.date_time(),
#             "public_url": f"https://cdn.example.com/{fake.file_name(extension='png')}",
#         },
#         {
#             "file_key": f"uploads/{fake.uuid4()}_{fake.file_name(extension='jpg')}",
#             "original_filename": fake.file_name(extension="jpg"),
#             "mime_type": "image/jpeg",
#             "file_size": fake.random_int(min=100, max=5_000_000),
#             "uploaded_at": fake.date_time(),
#             "public_url": f"https://cdn.example.com/{fake.file_name(extension='jpg')}",
#         }
#     ]
