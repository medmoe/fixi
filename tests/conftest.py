from datetime import datetime, UTC
from decimal import Decimal
from io import BytesIO
from typing import AsyncGenerator, Annotated
from unittest.mock import Mock, AsyncMock

import pytest
import pytest_asyncio
from PIL import Image
from faker import Faker
from fastapi import Request, Depends
from httpx import AsyncClient, ASGITransport
from redis import Redis
from sqlalchemy import text, insert, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from uuid6 import uuid7

from src.app.api.dependencies import rate_limiter_dependency, get_optional_user
from src.app.core.config import settings
from src.app.core.db.database import Base, async_get_db
from src.app.core.exceptions.http_exceptions import RateLimitException
from src.app.core.security import get_password_hash
from src.app.core.utils import cache as cache_module
from src.app.core.utils.rate_limit import RateLimiter
from src.app.main import app
from src.app.models import User, UserRole, WorkerProfile, TradeCategory, PortfolioImage
from tests.helpers.fakes import FakeRateLimiter

fake = Faker()

DATABASE_URI = settings.TEST_POSTGRES_ASYNC_URI
DATABASE_PREFIX = settings.TEST_POSTGRES_ASYNC_PREFIX
DATABASE_URL = settings.TEST_POSTGRES_URL or f"{DATABASE_PREFIX}{DATABASE_URI}"
REDIS_URI = settings.TEST_REDIS_URI

# Create test engine and session
test_engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    poolclass=NullPool,
    future=True
)
testSessionLocal = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)

TEST_PASSWORD = "testpassword123"


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
    async def get_test_db():
        yield async_session

    app.dependency_overrides[async_get_db] = get_test_db
    app.dependency_overrides[rate_limiter_dependency] = lambda: None  # disable rate limiter
    # Use ASGI transport so it uses the app in-memory
    # trigger lifespan so middleware initializes correctly on the right event loop
    async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def async_client_with_redis(async_session: AsyncSession):
    def get_test_db():
        return async_session

    app.dependency_overrides[async_get_db] = get_test_db

    RateLimiter._instance = None
    RateLimiter.pool = None
    RateLimiter.client = None
    RateLimiter.initialize(REDIS_URI)
    redis_client = RateLimiter.get_client()
    await redis_client.flushdb()

    async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
    ) as client:
        yield client, redis_client

    # teardown — close pool properly before clearing singleton
    if RateLimiter.pool is not None:
        await RateLimiter.pool.aclose()  # close all connections in the pool

    RateLimiter._instance = None
    RateLimiter.pool = None
    RateLimiter.client = None
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def async_client_with_rate_limit(
        async_session: AsyncSession
) -> AsyncGenerator[tuple[AsyncClient, FakeRateLimiter], None]:
    """ Client with controllable in-memory rate limiter """
    fake_rate_limiter = FakeRateLimiter()

    def get_test_db():
        return async_session

    async def fake_rate_limiter_dependency(
            request: Request,
            db: Annotated[AsyncSession, Depends(async_get_db)],
            user: dict | None = Depends(get_optional_user)
    ) -> None:
        path = request.url.path

        # mirror real rate_limiter_dependency logic
        if user:
            identifier: int | str = user['id']
        else:
            identifier = request.client.host if request.client else "unknown"

        # simulate rate limiter check using fake
        if await fake_rate_limiter.is_rate_limited(
                db=db,
                user_id=identifier,
                path=path,
                limit=fake_rate_limiter.limit,
                period=60,
        ):
            raise RateLimitException("Rate limit exceeded")

    app.dependency_overrides[async_get_db] = get_test_db
    app.dependency_overrides[rate_limiter_dependency] = fake_rate_limiter_dependency

    async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
    ) as client:
        yield client, fake_rate_limiter  # return both client and limiter for test control

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(async_session: AsyncSession) -> User:
    return await create_test_user(async_session, role_type=UserRole.WORKER)


@pytest_asyncio.fixture
async def customer_test_user(async_session: AsyncSession) -> User:
    return await create_test_user(async_session, role_type=UserRole.CUSTOMER)


@pytest_asyncio.fixture
async def other_customer_test_user(async_session: AsyncSession) -> User:
    return await create_test_user(async_session, role_type=UserRole.CUSTOMER)


@pytest_asyncio.fixture
async def test_admin_user(async_session: AsyncSession) -> User:
    return await create_test_user(async_session, is_superuser=True)


@pytest_asyncio.fixture
async def other_user(async_session: AsyncSession) -> User:
    return await create_test_user(async_session)


@pytest_asyncio.fixture
async def test_worker_profile(async_session: AsyncSession, test_user: User) -> WorkerProfile:
    return await create_test_worker_profile(async_session, test_user)


@pytest_asyncio.fixture
async def test_other_worker_profile(async_session: AsyncSession, other_user: User) -> WorkerProfile:
    return await create_test_worker_profile(async_session, other_user)


@pytest_asyncio.fixture
async def auth_headers(async_client_with_redis: tuple[AsyncClient, Redis], test_user: User) -> dict:
    """ Get authentication headers for a test user."""
    client, _ = async_client_with_redis
    login_data = {
        "username_or_email": test_user.username,
        "password": TEST_PASSWORD
    }
    response = await client.post("/api/v1/auth/login", json=login_data)
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def generate_auth_headers(async_client_with_redis: tuple[AsyncClient, Redis], user: User) -> dict:
    client, _ = async_client_with_redis
    login_data = {
        "username_or_email": user.username,
        "password": TEST_PASSWORD
    }
    response = await client.post("/api/v1/auth/login", json=login_data)
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest_asyncio.fixture
async def worker_profile_auth_headers(async_client_with_redis: tuple[AsyncClient, Redis], test_user: User) -> dict:
    """ Get authentication headers for a test user."""
    return await generate_auth_headers(async_client_with_redis, test_user)


@pytest_asyncio.fixture
async def other_auth_headers(async_client_with_redis: tuple[AsyncClient, Redis], other_user: User) -> dict:
    """ Get authentication headers for a test user."""
    return await generate_auth_headers(async_client_with_redis, other_user)


@pytest_asyncio.fixture
async def admin_auth_headers(async_client_with_redis: tuple[AsyncClient, Redis], test_admin_user: User) -> dict:
    """ Get authentication headers for a test user."""
    return await generate_auth_headers(async_client_with_redis, test_admin_user)


@pytest_asyncio.fixture
async def customer_auth_headers(async_client_with_redis: tuple[AsyncClient, Redis], customer_test_user: User) -> dict:
    """ Get authenticated header for a user with customer role type """
    return await generate_auth_headers(async_client_with_redis, customer_test_user)


@pytest_asyncio.fixture
async def other_customer_auth_headers(async_client_with_redis: tuple[AsyncClient, Redis], other_customer_test_user: User) -> dict:
    """ Get authenticated header for a user with customer role type """
    return await generate_auth_headers(async_client_with_redis, other_customer_test_user)


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
        hashed_password=get_password_hash(TEST_PASSWORD),
        **kwargs
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


async def create_test_worker_profile(async_session: AsyncSession, user: User | None = None, **kwargs) -> WorkerProfile:
    """ Create a test worker """
    if user is None:
        user = await create_test_user(async_session)
    worker = WorkerProfile(user_id=user.id, hourly_rate=Decimal(25.00), **kwargs)
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
            "hashed_password": get_password_hash(TEST_PASSWORD),
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
    users: list[User] = list(result.scalars().all())

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
    workers: list[WorkerProfile] = list(result.scalars().all())
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
        role_type=UserRole.WORKER
    )


@pytest.fixture
def current_user_dict():
    """Mock the current user from auth dependency."""
    return {
        "id": 1,
        "username": fake.user_name(),
        "email": fake.email(),
        "name": fake.name(),
        "is_superuser": False,
    }


@pytest_asyncio.fixture
async def test_trade_category(async_session: AsyncSession) -> TradeCategory:
    return await create_test_trade_category(async_session)


@pytest_asyncio.fixture
async def other_trade_category(async_session: AsyncSession) -> TradeCategory:
    return await create_test_trade_category(async_session)


async def create_test_trade_category(async_session: AsyncSession, **kwargs) -> TradeCategory:
    name = kwargs.get('name', fake.word())
    display_name = kwargs.get('display_name', fake.word())
    icon_name = kwargs.get('icon_name', fake.word())
    parent_id = kwargs.get('parent_id', None)
    trade_category = TradeCategory(name=name, display_name=display_name, icon_name=icon_name, parent_id=parent_id)
    async_session.add(trade_category)
    await async_session.commit()
    return trade_category


@pytest_asyncio.fixture
async def test_portfolio_images(async_session: AsyncSession, test_worker_profile: WorkerProfile, test_other_worker_profile: WorkerProfile) -> list[PortfolioImage]:
    return await create_test_portfolio_images(async_session, test_worker_profile, test_other_worker_profile)


async def create_test_portfolio_images(async_session: AsyncSession, test_worker_profile: WorkerProfile, test_other_worker_profile: WorkerProfile) -> list[PortfolioImage]:
    portfolio_image_rows = [{"worker_profile_id": test_worker_profile.id, "image_url": fake.image_url()} for _ in range(10)]
    portfolio_image_rows.extend([{"worker_profile_id": test_other_worker_profile.id, "image_url": fake.image_url()} for _ in range(10)])
    result = await async_session.execute(insert(PortfolioImage).returning(PortfolioImage), portfolio_image_rows)
    await async_session.commit()
    return list(result.scalars().all())
