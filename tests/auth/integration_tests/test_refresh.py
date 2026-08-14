import pytest
from httpx import AsyncClient

from tests.integration_tests.auth.helpers import (
    customer_payload,
    login_payload,
    create_valid_refresh_token,
    create_expired_refresh_token,
)


@pytest.mark.integration
class TestRefreshEndpoint:

    # ── Happy path ──────────────────────────────────────────────────────────
    async def test_successful_refresh(self, async_client_with_redis: AsyncClient):
        client, _ = async_client_with_redis
        await client.post("/api/v1/auth/register", json=customer_payload())
        response = await client.post("/api/v1/auth/login", json=login_payload())
        data = response.json()
        assert 'access_token' in data
        refresh_response = await client.post("/api/v1/auth/refresh")
        assert refresh_response.status_code == 200
        assert 'access_token' in refresh_response.json()
        assert data['access_token'] != refresh_response.json()['access_token']

    # ── Missing or Invalid Cookie Tests ─────────────────────────────────────
    async def test_refresh_missing_cookie_fails(self, async_client_with_redis):
        client, _ = async_client_with_redis

        # Sending request without any refresh_token cookie set
        response = await client.post("/api/v1/auth/refresh")

        assert response.status_code == 401
        assert response.json()["detail"] == "Refresh token missing."

    async def test_refresh_invalid_token_string_fails(self, async_client_with_redis):
        client, _ = async_client_with_redis

        # Passing an arbitrary invalid string as the cookie value
        client.cookies.set("refresh_token", "invalid.jwt.signature")
        response = await client.post("/api/v1/auth/refresh", )

        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid refresh token."

    # ── TokenType Mismatch Tests ────────────────────────────────────────────
    async def test_refresh_with_access_token_fails(self, async_client_with_redis):
        client, _ = async_client_with_redis

        # Register & Login to get a valid ACCESS token
        await client.post("/api/v1/auth/register", json=customer_payload())
        login_res = await client.post("/api/v1/auth/login", json=login_payload())
        access_token = login_res.json()["access_token"]

        # Attempt to use the access token in place of the refresh token
        client.cookies.set("refresh_token", access_token)
        response = await client.post("/api/v1/auth/refresh", )

        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid refresh token."

    # ── Expired Token Tests ─────────────────────────────────────────────────
    async def test_refresh_expired_token_fails(
            self,
            async_client_with_redis,
    ):
        client, _ = async_client_with_redis

        expired_token = await create_expired_refresh_token(username="johndoe")
        client.cookies.set("refresh_token", expired_token)
        response = await client.post("/api/v1/auth/refresh", )

        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid refresh token."

    # ── Non-existent or Deleted User Tests ──────────────────────────────────
    async def test_refresh_non_existent_user_fails(
            self,
            async_client_with_redis,
    ):
        client, _ = async_client_with_redis

        # Generate token for a user that is not in the DB
        orphan_token = await create_valid_refresh_token(username="ghost_user@example.com")
        client.cookies.set('refresh_token', orphan_token)
        response = await client.post("/api/v1/auth/refresh", )

        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid refresh token."
