import pytest
from httpx import AsyncClient
from sqlalchemy import select

from src.app.crud.crud_worker_profiles import crud_worker_profiles
from src.app.models import CustomerProfile
from tests.helpers.fakes import FakeRateLimiter


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def customer_payload(**overrides) -> dict:
    return {
        "name": "John Doe",
        "username": "johndoe",
        "email": "john@example.com",
        "password": "Secure123",
        "role_type": "customer",
        **overrides,
    }


def worker_payload(**overrides) -> dict:
    return {
        "name": "Jane Doe",
        "username": "janedoe",
        "email": "jane@example.com",
        "password": "Secure123",
        "role_type": "worker",
        **overrides,
    }


def login_payload(**overrides) -> dict:
    return {
        "username_or_email": "johndoe",
        "password": "Secure123",
        **overrides,
    }


# ---------------------------------------------------------------------------
# Register endpoint
# ---------------------------------------------------------------------------

@pytest.mark.integration
class TestRegisterEndpoint:

    # ── Happy path ──────────────────────────────────────────────────────────

    async def test_register_customer_success(self, async_client: AsyncClient):
        response = await async_client.post("/api/v1/auth/register", json=customer_payload())

        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "johndoe"
        assert data["email"] == "john@example.com"
        assert data["role"] == "customer"
        assert "id" in data
        assert "password" not in data  # never leak password
        assert "hashed_password" not in data  # never leak hash

    async def test_register_worker_success(self, async_client: AsyncClient):
        response = await async_client.post("/api/v1/auth/register", json=worker_payload())

        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "janedoe"
        assert data["role"] == "worker"

    # ── Duplicate detection ─────────────────────────────────────────────────

    async def test_register_duplicate_email_fails(self, async_client: AsyncClient):
        await async_client.post("/api/v1/auth/register", json=customer_payload())
        response = await async_client.post("/api/v1/auth/register", json=customer_payload(username="different_user"), )  # different username, same email
        assert response.status_code == 409
        assert "email" in response.json()["detail"].lower() or "registered" in response.json()["detail"].lower()

    async def test_register_duplicate_username_fails(self, async_client: AsyncClient):
        await async_client.post("/api/v1/auth/register", json=customer_payload())
        response = await async_client.post("/api/v1/auth/register", json=customer_payload(email="different@example.com"), )  # different email, same username
        print(response)
        assert response.status_code == 409

    async def test_register_duplicate_email_and_username_fails(self, async_client: AsyncClient):
        await async_client.post("/api/v1/auth/register", json=customer_payload())
        response = await async_client.post("/api/v1/auth/register", json=customer_payload())
        assert response.status_code == 409

    # ── Validation errors ───────────────────────────────────────────────────

    async def test_register_invalid_email_fails(self, async_client: AsyncClient):
        response = await async_client.post(
            "/api/v1/auth/register",
            json=customer_payload(email="not-an-email"),
        )
        assert response.status_code == 422

    async def test_register_weak_password_fails(self, async_client: AsyncClient):
        response = await async_client.post(
            "/api/v1/auth/register",
            json=customer_payload(password="weakpass"),  # no uppercase, no digit
        )
        assert response.status_code == 422

    async def test_register_invalid_role_fails(self, async_client: AsyncClient):
        response = await async_client.post(
            "/api/v1/auth/register",
            json=customer_payload(role_type="admin"),  # not in discriminated union
        )
        assert response.status_code == 422

    async def test_register_missing_required_field_fails(self, async_client: AsyncClient):
        payload = customer_payload()
        del payload["email"]
        response = await async_client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 422

    async def test_register_extra_fields_forbidden(self, async_client: AsyncClient):
        response = await async_client.post(
            "/api/v1/auth/register",
            json=customer_payload(extra_field="hacked"),
        )
        assert response.status_code == 422

    # ── DB side effects ─────────────────────────────────────────────────────

    async def test_register_customer_creates_customer_profile(self, async_client: AsyncClient, async_session):
        response = await async_client.post("/api/v1/auth/register", json=customer_payload())
        print(response.json())
        user_id = response.json()["id"]

        result = await async_session.execute(select(CustomerProfile).where(CustomerProfile.user_id == user_id))
        profile: CustomerProfile | None = result.scalars().first()
        assert profile is not None
        assert profile.user_id == user_id

    async def test_register_worker_creates_worker_profile(self, async_client: AsyncClient, async_session):
        response = await async_client.post("/api/v1/auth/register", json=worker_payload())
        user_id = response.json()["id"]

        profile = await crud_worker_profiles.get(async_session, user_id=user_id)
        assert profile is not None
        assert profile["user_id"] == user_id


# ---------------------------------------------------------------------------
# Login endpoint
# ---------------------------------------------------------------------------

@pytest.mark.integration
class TestLoginEndpoint:

    # ── Happy path ──────────────────────────────────────────────────────────

    async def test_login_with_username_success(self, async_client_with_redis: AsyncClient):
        await async_client_with_redis.post("/api/v1/auth/register", json=customer_payload())

        response = await async_client_with_redis.post(
            "/api/v1/auth/login",
            json=login_payload(username_or_email="johndoe"),
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_with_email_success(self, async_client_with_redis: AsyncClient):
        await async_client_with_redis.post("/api/v1/auth/register", json=customer_payload())

        response = await async_client_with_redis.post(
            "/api/v1/auth/login",
            json=login_payload(username_or_email="john@example.com"),
        )
        assert response.status_code == 200
        assert "access_token" in response.json()

    # ── Cookie ──────────────────────────────────────────────────────────────

    async def test_login_sets_refresh_token_cookie(self, async_client_with_redis: AsyncClient):
        await async_client_with_redis.post("/api/v1/auth/register", json=customer_payload())

        response = await async_client_with_redis.post("/api/v1/auth/login", json=login_payload())

        assert "refresh_token" in response.cookies
        cookie = response.headers.get("set-cookie", "")
        assert "HttpOnly" in cookie
        assert "SameSite=lax" in cookie

    async def test_login_cookie_not_secure_in_test_env(self, async_client_with_redis: AsyncClient):
        """secure=False expected in non-production environments"""
        await async_client_with_redis.post("/api/v1/auth/register", json=customer_payload())
        response = await async_client_with_redis.post("/api/v1/auth/login", json=login_payload())

        cookie = response.headers.get("set-cookie", "")
        assert "Secure" not in cookie  # test env should not set Secure flag

    # ── Auth failures ───────────────────────────────────────────────────────

    async def test_login_wrong_password_fails(self, async_client_with_redis: AsyncClient):
        await async_client_with_redis.post("/api/v1/auth/register", json=customer_payload())

        response = await async_client_with_redis.post(
            "/api/v1/auth/login",
            json=login_payload(password="WrongPass1"),
        )
        assert response.status_code == 401
        assert "access_token" not in response.json()

    async def test_login_nonexistent_user_fails(self, async_client_with_redis: AsyncClient):
        response = await async_client_with_redis.post(
            "/api/v1/auth/login",
            json=login_payload(username_or_email="ghost@example.com"),
        )
        assert response.status_code == 401

    async def test_login_wrong_and_nonexistent_same_response(self, async_client_with_redis: AsyncClient):
        """Both wrong password and unknown user should return identical response — no user enumeration"""
        await async_client_with_redis.post("/api/v1/auth/register", json=customer_payload())

        wrong_password = await async_client_with_redis.post(
            "/api/v1/auth/login",
            json=login_payload(password="WrongPass1"),
        )
        unknown_user = await async_client_with_redis.post(
            "/api/v1/auth/login",
            json=login_payload(username_or_email="ghost@example.com"),
        )
        assert wrong_password.status_code == unknown_user.status_code
        assert wrong_password.json()["detail"] == unknown_user.json()["detail"]

    # ── Validation ──────────────────────────────────────────────────────────

    async def test_login_missing_password_fails(self, async_client_with_redis: AsyncClient):
        response = await async_client_with_redis.post(
            "/api/v1/auth/login",
            json={"username_or_email": "johndoe"},
        )
        assert response.status_code == 422

    async def test_login_empty_credentials_fails(self, async_client_with_redis: AsyncClient):
        response = await async_client_with_redis.post("/api/v1/auth/login", json={"username_or_email": "", "password": ""})
        assert response.status_code == 422


class TestLoginRateLimit:
    async def test_login_allowed_under_limit(
            self,
            async_client_with_rate_limit: tuple[AsyncClient, FakeRateLimiter],
    ):
        client, limiter = async_client_with_rate_limit
        response = await client.post("/api/v1/auth/login", json={"username_or_email": "johndoe", "password": "Pass123456"})
        assert response.status_code != 429

    async def test_login_blocked_after_limit_exceeded(
            self,
            async_client_with_rate_limit: tuple[AsyncClient, FakeRateLimiter],
    ):
        client, limiter = async_client_with_rate_limit
        limiter.set_count(path="/api/v1/auth/login", count=10)
        print(f"Limiter counts before request: {limiter.counts}")  # ✅ debug

        response = await client.post("/api/v1/auth/login", json={"username_or_email": "johndoe", "password": "Pass123456"})
        print(f"Limiter counts after request: {limiter.counts}")  # ✅ debug
        print(f"Response status: {response.status_code}")
        assert response.status_code == 429

    async def test_rate_limit_resets_after_window(
            self,
            async_client_with_rate_limit: tuple[AsyncClient, FakeRateLimiter],
    ):
        client, limiter = async_client_with_rate_limit
        limiter.set_count(path="/api/v1/auth/login", count=10, ip="testclient")
        limiter.reset()
        response = await client.post("/api/v1/auth/login", json={"username_or_email": "johndoe", "password": "Pass123456"})
        assert response.status_code != 429
