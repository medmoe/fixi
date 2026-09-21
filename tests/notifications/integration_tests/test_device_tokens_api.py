from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import DeviceToken


class TestRegisterDeviceToken:
    """POST /api/v1/notifications/device-tokens"""

    async def test_registers_a_new_token(self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers, customer_test_user):
        response = await async_client.post(
            "/api/v1/notifications/device-tokens",
            json={"token": "web-token-1", "platform": "web"},
            headers=customer_auth_headers,
        )

        assert response.status_code == 201
        body = response.json()
        assert body["token"] == "web-token-1"
        assert body["platform"] == "web"
        assert body["user_id"] == customer_test_user.id

        row = (await async_session.execute(select(DeviceToken).where(DeviceToken.token == "web-token-1"))).scalar_one()
        assert row.user_id == customer_test_user.id

    async def test_re_registering_the_same_token_updates_it_instead_of_duplicating(
            self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers, customer_test_user
    ):
        await async_client.post(
            "/api/v1/notifications/device-tokens",
            json={"token": "shared-token", "platform": "android"},
            headers=customer_auth_headers,
        )

        response = await async_client.post(
            "/api/v1/notifications/device-tokens",
            json={"token": "shared-token", "platform": "web"},
            headers=customer_auth_headers,
        )

        assert response.status_code == 201
        assert response.json()["platform"] == "web"

        rows = (await async_session.execute(select(DeviceToken).where(DeviceToken.token == "shared-token"))).scalars().all()
        assert len(rows) == 1
        assert rows[0].platform.value == "web"

    async def test_re_registering_under_a_different_user_reassigns_ownership(
            self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers, other_customer_auth_headers, other_customer_test_user
    ):
        await async_client.post(
            "/api/v1/notifications/device-tokens",
            json={"token": "device-x", "platform": "web"},
            headers=customer_auth_headers,
        )

        response = await async_client.post(
            "/api/v1/notifications/device-tokens",
            json={"token": "device-x", "platform": "web"},
            headers=other_customer_auth_headers,
        )

        assert response.status_code == 201
        assert response.json()["user_id"] == other_customer_test_user.id

    async def test_rejects_an_invalid_platform(self, async_client: AsyncClient, customer_auth_headers):
        response = await async_client.post(
            "/api/v1/notifications/device-tokens",
            json={"token": "bad-platform-token", "platform": "smart-fridge"},
            headers=customer_auth_headers,
        )
        assert response.status_code == 422

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient):
        response = await async_client.post(
            "/api/v1/notifications/device-tokens",
            json={"token": "no-auth-token", "platform": "web"},
        )
        assert response.status_code == 401


class TestUnregisterDeviceToken:
    """DELETE /api/v1/notifications/device-tokens/{token}"""

    async def test_deletes_the_callers_own_token(
            self, async_client: AsyncClient, async_session: AsyncSession, customer_auth_headers
    ):
        await async_client.post(
            "/api/v1/notifications/device-tokens",
            json={"token": "to-delete", "platform": "web"},
            headers=customer_auth_headers,
        )

        response = await async_client.delete("/api/v1/notifications/device-tokens/to-delete", headers=customer_auth_headers)

        assert response.status_code == 204
        remaining = (await async_session.execute(select(DeviceToken).where(DeviceToken.token == "to-delete"))).scalar_one_or_none()
        assert remaining is None

    async def test_cannot_delete_another_users_token(
            self, async_client: AsyncClient, customer_auth_headers, other_customer_auth_headers
    ):
        await async_client.post(
            "/api/v1/notifications/device-tokens",
            json={"token": "someone-elses-token", "platform": "web"},
            headers=customer_auth_headers,
        )

        response = await async_client.delete(
            "/api/v1/notifications/device-tokens/someone-elses-token", headers=other_customer_auth_headers
        )

        assert response.status_code == 404

    async def test_nonexistent_token_returns_404(self, async_client: AsyncClient, customer_auth_headers):
        response = await async_client.delete("/api/v1/notifications/device-tokens/never-existed", headers=customer_auth_headers)
        assert response.status_code == 404

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient):
        response = await async_client.delete("/api/v1/notifications/device-tokens/whatever")
        assert response.status_code == 401
