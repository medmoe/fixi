from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.crud.crud_admin_action_log import crud_admin_action_log
from src.app.crud.crud_users import crud_users
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

    async def test_excludes_admin_accounts(self, async_client: AsyncClient, admin_auth_headers, test_admin_user, test_user: User):
        response = await async_client.get("/api/v1/admin/users", params={"limit": 100}, headers=admin_auth_headers)

        assert response.status_code == 200
        body = response.json()
        ids = {u["id"] for u in body["data"]}
        assert test_admin_user.id not in ids
        assert test_user.id in ids
        assert all(not u["is_superuser"] for u in body["data"])

    async def test_search_never_matches_admin_accounts(self, async_client: AsyncClient, admin_auth_headers, test_admin_user):
        response = await async_client.get("/api/v1/admin/users", params={"search": test_admin_user.username}, headers=admin_auth_headers)

        assert response.status_code == 200
        assert response.json()["data"] == []

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


class TestPermanentDelete:
    """POST /api/v1/admin/users/{user_id}/delete-permanently"""

    @pytest.fixture(autouse=True)
    def stub_storage(self, monkeypatch: pytest.MonkeyPatch) -> MagicMock:
        self.delete_prefix = MagicMock(return_value=0)
        monkeypatch.setattr("src.app.services.minio_client.minio_client.delete_prefix", self.delete_prefix)
        return self.delete_prefix

    async def test_admin_can_permanently_delete_a_user(self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers, test_user: User):
        response = await async_client.post(
            f"/api/v1/admin/users/{test_user.id}/delete-permanently", json={"reason": "GDPR request #12"}, headers=admin_auth_headers
        )

        assert response.status_code == 204
        assert await crud_users.get(db=async_session, id=test_user.id) is None

    async def test_leaves_an_audit_row_that_outlives_the_user(self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers, test_admin_user, test_user: User):
        await async_client.post(
            f"/api/v1/admin/users/{test_user.id}/delete-permanently", json={"reason": "GDPR request #12"}, headers=admin_auth_headers
        )

        logs = await crud_admin_action_log.get_multi(db=async_session, target_type="user", target_id=test_user.id)
        assert len(logs["data"]) == 1
        log = logs["data"][0]
        assert log["action"] == "hard_delete_user"
        assert log["actor_id"] == test_admin_user.id
        assert log["reason"] == "GDPR request #12"

    async def test_deletes_soft_deleted_accounts_too(self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers):
        deactivated = await create_test_user(async_session, is_deleted=True)

        response = await async_client.post(f"/api/v1/admin/users/{deactivated.id}/delete-permanently", json={}, headers=admin_auth_headers)

        assert response.status_code == 204
        assert await crud_users.get(db=async_session, id=deactivated.id) is None

    async def test_removes_the_users_stored_files(self, async_client: AsyncClient, admin_auth_headers, test_user: User):
        await async_client.post(f"/api/v1/admin/users/{test_user.id}/delete-permanently", json={}, headers=admin_auth_headers)

        prefixes = {call.kwargs["prefix"] for call in self.delete_prefix.call_args_list}
        assert f"avatars/{test_user.id}/" in prefixes
        assert f"portfolio_images/{test_user.id}/" in prefixes
        assert f"cni/{test_user.id}." in prefixes
        # never a bare "{id}" prefix that would also match user 12 -> 123
        assert all(p.endswith(("/", ".")) for p in prefixes)

    async def test_storage_failure_does_not_fail_the_request(self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers, test_user: User):
        self.delete_prefix.side_effect = RuntimeError("minio down")

        response = await async_client.post(f"/api/v1/admin/users/{test_user.id}/delete-permanently", json={}, headers=admin_auth_headers)

        assert response.status_code == 204
        assert await crud_users.get(db=async_session, id=test_user.id) is None

    async def test_cannot_delete_yourself(self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers, test_admin_user):
        response = await async_client.post(f"/api/v1/admin/users/{test_admin_user.id}/delete-permanently", json={}, headers=admin_auth_headers)

        assert response.status_code == 400
        assert await crud_users.get(db=async_session, id=test_admin_user.id) is not None

    async def test_cannot_delete_another_admin(self, async_client: AsyncClient, async_session: AsyncSession, admin_auth_headers):
        other_admin = await create_test_user(async_session, is_superuser=True)

        response = await async_client.post(f"/api/v1/admin/users/{other_admin.id}/delete-permanently", json={}, headers=admin_auth_headers)

        assert response.status_code == 403
        assert await crud_users.get(db=async_session, id=other_admin.id) is not None
        self.delete_prefix.assert_not_called()

    async def test_404_for_a_missing_user(self, async_client: AsyncClient, admin_auth_headers):
        response = await async_client.post("/api/v1/admin/users/999999/delete-permanently", json={}, headers=admin_auth_headers)
        assert response.status_code == 404

    async def test_non_admin_forbidden(self, async_client: AsyncClient, auth_headers, test_user: User):
        response = await async_client.post(f"/api/v1/admin/users/{test_user.id}/delete-permanently", json={}, headers=auth_headers)
        assert response.status_code == 403
