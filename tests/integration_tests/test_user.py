import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.db.crud_token_blacklist import crud_token_blacklist
from src.app.crud.crud_users import crud_users
from src.app.models import User


# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
def user_payload(**overrides) -> dict:
    return {
        "name": "John Doe",
        "username": "john_doe",
        "email": "john.doe@example.com",
        "password": "SuperSecure123##",
        **overrides
    }


def password_payload(**overrides) -> dict:
    return {
        "current_password": "testpassword123",
        "new_password": "Secure123##",
        **overrides
    }


# ——————————— Test Get User ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

class TestGetUser:
    @pytest.mark.integration
    async def test_successful_user_retrieval(self, async_client: AsyncClient, test_user: User, auth_headers: dict):
        response = await async_client.get(f"/api/v1/user/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for key in ("id", "name", "username", "email", "profile_image_url", "role_type", "created_at"):
            assert key in data
            assert data[key] is not None

    @pytest.mark.integration
    async def test_failed_user_retrieval_when_unauthenticated(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/user/me")
        assert response.status_code == 401


class TestGetUserByUsername:
    @pytest.mark.integration
    async def test_successful_user_retrieval(self, async_client: AsyncClient, test_user: User):
        response = await async_client.get(f"/api/v1/user/{test_user.username}")
        assert response.status_code == 200
        for key in ("id", "name", "username", "email", "profile_image_url", "role_type", "created_at"):
            assert key in response.json()
            assert response.json()[key] is not None

    @pytest.mark.integration
    async def test_failed_user_retrieval_of_non_existed_user(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/user/non_existed_user")
        assert response.status_code == 404


# ——————————— Test Patch User ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

class TestPatchUser:
    @pytest.mark.integration
    async def test_successful_user_update(self, async_client: AsyncClient, auth_headers: dict, test_user: User):
        response = await async_client.patch(
            f"/api/v1/user/{test_user.username}",
            headers=auth_headers,
            json={"name": "Updated Name"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"

    @pytest.mark.integration
    async def test_failed_user_update_when_user_not_owner(self, async_client: AsyncClient, test_user: User, other_auth_headers: dict):
        response = await async_client.patch(
            f"/api/v1/user/{test_user.username}",
            json={"name": "Updated Name"},
            headers=other_auth_headers,
        )
        assert response.status_code == 403

    @pytest.mark.integration
    async def test_failed_user_update_when_user_unauthenticated(self, async_client: AsyncClient, test_user: User):
        response = await async_client.patch(
            f"/api/v1/user/{test_user.username}",
            json={"name": "Updated Name"},
        )
        assert response.status_code == 401

    @pytest.mark.integration
    async def test_failed_user_update_of_nonexistent_user(self, async_client: AsyncClient, test_user: User):
        response = await async_client.patch(
            f"/api/v1/user/nonexistent_user",
            json={"name": "Updated Name"},
        )
        assert response.status_code == 401

    @pytest.mark.integration
    async def test_failed_user_update_of_inactive_user(
            self,
            async_client: AsyncClient,
            test_user: User,
            auth_headers: dict,
            async_session: AsyncSession
    ):
        test_user.is_deleted = True
        async_session.add(test_user)
        await async_session.commit()
        response = await async_client.patch(
            f"/api/v1/user/{test_user.username}",
            json={"name": "Updated Name"},
            headers=auth_headers,
        )
        print(response.json())
        assert response.status_code == 401

    @pytest.mark.integration
    async def test_failed_user_update_of_existing_email(self, async_client: AsyncClient, test_user: User, other_user: User, auth_headers: dict):
        response = await async_client.patch(
            f"/api/v1/user/{test_user.username}",
            json={"email": other_user.email},
            headers=auth_headers,
        )
        assert response.status_code == 409

    @pytest.mark.integration
    async def test_failed_user_update_of_existing_username(self, async_client: AsyncClient, test_user: User, other_user: User, auth_headers: dict):
        response = await async_client.patch(
            f"/api/v1/user/{test_user.username}",
            json={"username": other_user.username},
            headers=auth_headers,
        )
        assert response.status_code == 409

    @pytest.mark.integration
    async def test_failed_user_update_when_adding_extra_fields(self, async_client: AsyncClient, test_user: User, auth_headers: dict):
        response = await async_client.patch(
            f"/api/v1/user/{test_user.username}",
            json={"username": "new_username", "extra_field": "extra_value"},
            headers=auth_headers,
        )
        assert response.status_code == 422


# ——————————— Patch password ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

class TestPatchPassword:
    @pytest.mark.integration
    async def test_successful_password_update(self, async_client: AsyncClient, test_user: User, auth_headers: dict):
        response = await async_client.patch(
            f"/api/v1/user/{test_user.username}/password",
            headers=auth_headers,
            json=password_payload()
        )
        assert response.status_code == 200

    @pytest.mark.integration
    async def test_failed_password_update_if_adding_extra_fields(self, async_client: AsyncClient, test_user: User, auth_headers: dict):
        response = await async_client.patch(
            f"/api/v1/user/{test_user.username}/password",
            json=password_payload(extra="extra_field"),
            headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.integration
    async def test_failed_password_update_of_unauthenticated_user(self, async_client: AsyncClient, test_user: User):
        response = await async_client.patch(
            f"/api/v1/user/{test_user.username}/password",
            json=password_payload(),
        )
        assert response.status_code == 401

    @pytest.mark.integration
    async def test_failed_password_update_of_inactive_user(self, async_client: AsyncClient, test_user: User, auth_headers: dict, async_session: AsyncSession):
        test_user.is_deleted = True
        async_session.add(test_user)
        await async_session.commit()
        response = await async_client.patch(
            f"/api/v1/user/{test_user.username}/password",
            json=password_payload(),
            headers=auth_headers
        )
        assert response.status_code == 401

    @pytest.mark.integration
    async def test_failed_password_update_of_non_existed_user(self, async_client: AsyncClient, test_user: User, auth_headers: dict):
        response = await async_client.patch(
            f"/api/v1/user/doesNotExist/password",
            json=password_payload(),
            headers=auth_headers
        )
        assert response.status_code == 403

    @pytest.mark.integration
    async def test_failed_password_update_when_not_owner(self, async_client: AsyncClient, test_user: User, auth_headers: dict, other_user: User):
        response = await async_client.patch(
            f"/api/v1/user/{other_user.username}/password",
            json=password_payload(),
            headers=auth_headers
        )
        assert response.status_code == 403


# ——————————— Soft Delete ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

class TestSoftDeleteUser:
    @pytest.mark.integration
    async def test_successful_soft_delete(self, async_client: AsyncClient, test_user: User, auth_headers: dict, async_session: AsyncSession):
        response = await async_client.delete(f"/api/v1/user/{test_user.username}", headers=auth_headers)
        assert response.status_code == 200
        user = await crud_users.get(db=async_session, username=test_user.username, is_deleted=False)
        assert user is None

    @pytest.mark.integration
    async def test_failed_soft_delete_of_unauthenticated_user(self, async_client: AsyncClient, test_user: User):
        response = await async_client.delete(f"/api/v1/user/{test_user.username}")
        assert response.status_code == 401

    @pytest.mark.integration
    async def test_failed_soft_delete_of_unexisted_user(self, async_client: AsyncClient, test_user: User):
        response = await async_client.delete(f"/api/v1/user/doesNotExist")
        assert response.status_code == 401

    @pytest.mark.integration
    async def test_failed_soft_delete_when_not_owner(self, async_client: AsyncClient, test_user: User, other_user: User, auth_headers: dict):
        response = await async_client.delete(f"/api/v1/user/{other_user.username}", headers=auth_headers)
        assert response.status_code == 403


# ——————————— Hard Delete ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
class TestHardDeleteUser:

    @pytest.mark.integration
    async def test_successful_hard_delete(self, async_client: AsyncClient, test_admin_user, admin_auth_headers: dict, test_user: User, async_session: AsyncSession):
        response = await async_client.delete(f"/api/v1/user/{test_user.username}/hard", headers=admin_auth_headers)
        assert response.status_code == 200
        deleted_user = await crud_users.get(db=async_session, username=test_user.username)
        assert deleted_user is None

    @pytest.mark.integration
    async def test_non_admin_cannot_hard_delete(
            self,
            async_client: AsyncClient,
            auth_headers: dict,
            test_user: User,
    ):
        response = await async_client.delete(
            f"/api/v1/user/{test_user.username}/hard",
            headers=auth_headers,
        )

        assert response.status_code == 403

    @pytest.mark.integration
    async def test_hard_delete_requires_authentication(
            self,
            async_client: AsyncClient,
            test_user: User,
    ):
        response = await async_client.delete(
            f"/api/v1/user/{test_user.username}/hard"
        )

        assert response.status_code == 401

    @pytest.mark.integration
    async def test_invalid_token_cannot_hard_delete(
            self,
            async_client: AsyncClient,
            test_user: User,
    ):
        response = await async_client.delete(
            f"/api/v1/user/{test_user.username}/hard",
            headers={"Authorization": "Bearer invalid-token"},
        )

        assert response.status_code == 401

    @pytest.mark.integration
    async def test_hard_delete_nonexistent_user(
            self,
            async_client: AsyncClient,
            admin_auth_headers: dict,
    ):
        response = await async_client.delete(
            "/api/v1/user/does-not-exist/hard",
            headers=admin_auth_headers,
        )

        assert response.status_code == 404

# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
