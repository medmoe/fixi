import pytest
from httpx import AsyncClient

from src.app.models.user import User

PATH = "/api/v1/service-categories"


@pytest.mark.integration
class TestServiceCategoryEndPoints:
    """Integration tests for service category endpoints."""

    async def test_create_service_category(
            self,
            async_client: AsyncClient,
            admin_auth_headers: dict,
            test_admin_user: User
    ):
        """Test creating a new service category successfully."""
        payload = {
            "name": "Test Service Category",
            "description": "This is a test service category."
        }
        response = await async_client.post(
            PATH,
            json=payload,
            headers=admin_auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["description"] == payload["description"]
        assert 'id' in data

    async def test_create_service_category_failed_with_not_super_user(
            self,
            async_client: AsyncClient,
            test_user: User,
            auth_headers: dict
    ):
        response = await async_client.post(
            PATH,
            json={
                "name": "Test Service Category",
                "description": "This is a test service category."
            },
            headers=auth_headers
        )
        assert response.status_code == 403

    async def test_create_service_category_failed_with_no_name(
            self,
            async_client: AsyncClient,
            admin_auth_headers: dict,
            test_admin_user: User
    ):
        response = await async_client.post(
            PATH,
            json={
                "description": "This is a test service category."
            },
            headers=admin_auth_headers
        )
        assert response.status_code == 422

    async def test_create_service_category_failed_with_duplicate_names(
            self,
            async_client: AsyncClient,
            admin_auth_headers: dict,
            test_admin_user: User
    ):
        await async_client.post(
            PATH,
            json={
                "name": "Test Service Category",
                "description": "This is a test service category."
            },
            headers=admin_auth_headers
        )
        response = await async_client.post(
            PATH,
            json={
                "name": "Test Service Category",
                "description": "This is a test service category."
            },
            headers=admin_auth_headers
        )
        assert response.status_code == 422

    async def test_retrieve_service_categories(
            self,
            async_client: AsyncClient,
            admin_auth_headers: dict,
            test_admin_user: User
    ):
        payload = [{"name": f"category {i}", "description": "test"} for i in range(10)]
        response = await async_client.post(f"{PATH}/bulk", json=payload, headers=admin_auth_headers)
        assert response.status_code == 201

        response = await async_client.get(
            PATH,
            headers=admin_auth_headers
        )
        assert response.status_code == 200
        assert len(response.json()) == len(payload)
