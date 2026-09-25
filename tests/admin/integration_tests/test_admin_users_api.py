from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import User
from tests.conftest import create_test_user


class TestListUsers:
    """GET /api/v1/admin/users"""

    async def test_admin_can_list_users(self, async_client: AsyncClient, admin_auth_headers, test_user: User):
        response = await async_client.get("/api/v1/admin/users", headers=admin_auth_headers)

        assert response.status_code == 200
        body = response.json()
        assert any(u["id"] == test_user.id for u in body["data"])

    async def test_search_filters_by_term(self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers):
        target = await create_test_user(async_session, name="Findable Person")

        response = await async_client.get("/api/v1/admin/users", params={"search": "Findable"}, headers=admin_auth_headers)

        assert response.status_code == 200
        body = response.json()
        assert len(body["data"]) == 1
        assert body["data"][0]["id"] == target.id

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers):
        response = await async_client.get("/api/v1/admin/users", headers=auth_headers)
        assert response.status_code == 403

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/admin/users")
        assert response.status_code == 401


class TestGetUserDetail:
    """GET /api/v1/admin/users/{user_id}"""

    async def test_admin_can_view_a_users_detail(self, async_client: AsyncClient, admin_auth_headers, test_user: User):
        response = await async_client.get(f"/api/v1/admin/users/{test_user.id}", headers=admin_auth_headers)

        assert response.status_code == 200
        assert response.json()["id"] == test_user.id

    async def test_404_for_a_missing_user(self, async_client: AsyncClient, admin_auth_headers):
        response = await async_client.get("/api/v1/admin/users/999999", headers=admin_auth_headers)
        assert response.status_code == 404

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers, test_user: User):
        response = await async_client.get(f"/api/v1/admin/users/{test_user.id}", headers=auth_headers)
        assert response.status_code == 403


class TestSuspendAndReactivate:
    """POST /api/v1/admin/users/{user_id}/suspend, /reactivate"""

    async def test_admin_can_suspend_a_user(self, async_client: AsyncClient, admin_auth_headers, test_user: User):
        response = await async_client.post(
            f"/api/v1/admin/users/{test_user.id}/suspend", json={"reason": "Policy violation"}, headers=admin_auth_headers
        )

        assert response.status_code == 200
        assert response.json()["is_suspended"] is True

    async def test_admin_can_reactivate_a_suspended_user(self, async_client: AsyncClient, admin_auth_headers, test_user: User):
        await async_client.post(f"/api/v1/admin/users/{test_user.id}/suspend", json={}, headers=admin_auth_headers)

        response = await async_client.post(f"/api/v1/admin/users/{test_user.id}/reactivate", json={}, headers=admin_auth_headers)

        assert response.status_code == 200
        assert response.json()["is_suspended"] is False

    async def test_suspending_twice_returns_400(self, async_client: AsyncClient, admin_auth_headers, test_user: User):
        await async_client.post(f"/api/v1/admin/users/{test_user.id}/suspend", json={}, headers=admin_auth_headers)

        response = await async_client.post(f"/api/v1/admin/users/{test_user.id}/suspend", json={}, headers=admin_auth_headers)

        assert response.status_code == 400

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers, test_user: User):
        response = await async_client.post(f"/api/v1/admin/users/{test_user.id}/suspend", json={}, headers=auth_headers)
        assert response.status_code == 403

    async def test_suspended_user_cannot_log_in(
            self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers, test_user: User
    ):
        await async_client.post(f"/api/v1/admin/users/{test_user.id}/suspend", json={}, headers=admin_auth_headers)

        response = await async_client.post(
            "/api/v1/auth/login", json={"username_or_email": test_user.username, "password": "testpassword123"}
        )

        assert response.status_code == 401

    async def test_suspended_users_existing_token_stops_working(
            self, async_client: AsyncClient, admin_auth_headers, worker_profile_auth_headers, test_user: User
    ):
        # worker_profile_auth_headers logs test_user in *before* suspension --
        # this token must stop verifying the moment they're suspended.
        me_before = await async_client.get("/api/v1/user/me", headers=worker_profile_auth_headers)
        assert me_before.status_code == 200

        await async_client.post(f"/api/v1/admin/users/{test_user.id}/suspend", json={}, headers=admin_auth_headers)

        me_after = await async_client.get("/api/v1/user/me", headers=worker_profile_auth_headers)
        assert me_after.status_code == 401


class TestGetUserAuditLog:
    """GET /api/v1/admin/users/{user_id}/audit-log"""

    async def test_records_actor_target_and_timestamp(self, async_client: AsyncClient, admin_auth_headers, test_admin_user, test_user: User):
        await async_client.post(
            f"/api/v1/admin/users/{test_user.id}/suspend", json={"reason": "Policy violation"}, headers=admin_auth_headers
        )

        response = await async_client.get(f"/api/v1/admin/users/{test_user.id}/audit-log", headers=admin_auth_headers)

        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["action"] == "suspend_user"
        assert body[0]["target_id"] == test_user.id
        assert body[0]["actor_id"] == test_admin_user.id
        assert body[0]["reason"] == "Policy violation"
        assert body[0]["created_at"] is not None

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers, test_user: User):
        response = await async_client.get(f"/api/v1/admin/users/{test_user.id}/audit-log", headers=auth_headers)
        assert response.status_code == 403
