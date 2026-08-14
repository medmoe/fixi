import jwt
import pytest
from httpx import AsyncClient

from .helpers import customer_payload, login_payload, worker_payload


@pytest.mark.integration
class TestLoginEndpoint:

    # ── Happy path ──────────────────────────────────────────────────────────

    async def test_login_with_username_success(self, async_client_with_redis: AsyncClient):
        client, _ = async_client_with_redis
        await client.post("/api/v1/auth/register", json=customer_payload())

        response = await client.post(
            "/api/v1/auth/login",
            json=login_payload(),
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_with_email_success(self, async_client_with_redis: AsyncClient):
        client, _ = async_client_with_redis
        await client.post("/api/v1/auth/register", json=customer_payload())

        response = await client.post(
            "/api/v1/auth/login",
            json=login_payload(username_or_email="john@example.com"),
        )
        assert response.status_code == 200
        assert "access_token" in response.json()

    async def test_login_with_worker_role_success(self, async_client_with_redis):
        client, _ = async_client_with_redis

        # register worker
        await client.post("/api/v1/auth/register", json=worker_payload())

        # ✅ login as the worker we just registered
        response = await client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "janedoe", "password": "Secure123"},  # ✅ matches worker_payload username
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        decode = jwt.decode(data['access_token'], options={"verify_signature": False})
        assert decode['role'] == 'worker'
        assert data["token_type"] == "bearer"

    # ── Cookie ──────────────────────────────────────────────────────────────

    async def test_login_sets_refresh_token_cookie(self, async_client_with_redis: AsyncClient):
        client, _ = async_client_with_redis
        await client.post("/api/v1/auth/register", json=customer_payload())

        response = await client.post("/api/v1/auth/login", json=login_payload())

        assert "refresh_token" in response.cookies
        cookie = response.headers.get("set-cookie", "")
        assert "HttpOnly" in cookie
        assert "SameSite=lax" in cookie

    async def test_login_cookie_not_secure_in_test_env(self, async_client_with_redis: AsyncClient):
        """secure=False expected in non-production environments"""
        client, _ = async_client_with_redis
        await client.post("/api/v1/auth/register", json=customer_payload())
        response = await client.post("/api/v1/auth/login", json=login_payload())

        cookie = response.headers.get("set-cookie", "")
        assert "Secure" not in cookie  # test env should not set Secure flag

    # ── Auth failures ───────────────────────────────────────────────────────

    async def test_login_wrong_password_fails(self, async_client_with_redis: AsyncClient):
        client, _ = async_client_with_redis
        await client.post("/api/v1/auth/register", json=customer_payload())

        response = await client.post(
            "/api/v1/auth/login",
            json=login_payload(password="wrong"),
        )
        assert response.status_code == 401
        assert "access_token" not in response.json()

    async def test_login_nonexistent_user_fails(self, async_client_with_redis: AsyncClient):
        client, _ = async_client_with_redis
        response = await client.post(
            "/api/v1/auth/login",
            json=login_payload(username_or_email="ghost@example.com"),
        )
        assert response.status_code == 401

    async def test_login_wrong_and_nonexistent_same_response(self, async_client_with_redis: AsyncClient):
        """Both wrong password and unknown user should return identical response — no user enumeration"""
        client, _ = async_client_with_redis
        await client.post("/api/v1/auth/register", json=customer_payload())

        wrong_password = await client.post(
            "/api/v1/auth/login",
            json=login_payload(password="WrongPass1"),
        )
        unknown_user = await client.post(
            "/api/v1/auth/login",
            json=login_payload(username_or_email="ghost@example.com"),
        )
        assert wrong_password.status_code == unknown_user.status_code
        assert wrong_password.json()["detail"] == unknown_user.json()["detail"]

    # ── Validation ──────────────────────────────────────────────────────────

    async def test_login_missing_password_fails(self, async_client_with_redis: AsyncClient):
        client, _ = async_client_with_redis
        response = await client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "johndoe"},
        )
        assert response.status_code == 422

    async def test_login_missing_username_or_email_fails(self, async_client_with_redis: AsyncClient):
        client, _ = async_client_with_redis
        response = await client.post(
            "/api/v1/auth/login",
            json={"password": "Pass123456"},
        )
        assert response.status_code == 422

    async def test_login_username_or_email_exceeds_max_length(self, async_client_with_redis: AsyncClient):
        client, _ = async_client_with_redis
        response = await client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "a" * 256, "password": "Pass123456"},
        )
        assert response.status_code == 422

    async def test_login_password_exceeds_max_length(self, async_client_with_redis: AsyncClient):
        client, _ = async_client_with_redis
        response = await client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "johndoe", "password": "a" * 129},
        )
        assert response.status_code == 422
