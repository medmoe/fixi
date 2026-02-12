import pytest
from jose import jwt

from src.app.core.config import settings
from src.app.models.user import UserRole


class TestAuthV2:
    @pytest.mark.asyncio
    async def test_register_customer_success(self, async_client):
        payload = {
            "name": "Customer One",
            "username": "customerone",
            "email": "customer.one@example.com",
            "password": "StrongPass123!",
            "role": "customer",
            "saved_addresses": ["123 Main St"],
            "loyalty_points": 10,
        }

        response = await async_client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 201
        body = response.json()
        assert body["username"] == payload["username"]
        assert body["role"] == UserRole.CUSTOMER.value

    @pytest.mark.asyncio
    async def test_register_handyman_requires_skill_category(self, async_client):
        payload = {
            "name": "Handyman One",
            "username": "handymanone",
            "email": "handyman.one@example.com",
            "password": "StrongPass123!",
            "role": "handyman",
            "skills": ["plumbing"],
            "hourly_rate": 60.0,
            "availability": {"weekdays": "9-5"},
        }

        response = await async_client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_login_includes_role_claim(self, async_client):
        register_payload = {
            "name": "Handyman Two",
            "username": "handymantwo",
            "email": "handyman.two@example.com",
            "password": "StrongPass123!",
            "role": "handyman",
            "skill_category": "Electrical",
            "skills": ["wiring"],
            "hourly_rate": 90.0,
            "availability": {"weekdays": "9-5"},
        }
        await async_client.post("/api/v1/auth/register", json=register_payload)

        response = await async_client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "handymantwo", "password": "StrongPass123!"},
        )
        assert response.status_code == 200
        token = response.json()["access_token"]
        payload = jwt.decode(token, settings.SECRET_KEY.get_secret_value(), algorithms=[settings.ALGORITHM])
        assert payload["role"] == UserRole.HANDYMAN.value
        assert payload["sub"] == "handymantwo"
        assert payload["email"] == "handyman.two@example.com"

    @pytest.mark.asyncio
    async def test_handyman_route_forbidden_for_customer(self, async_client):
        register_payload = {
            "name": "Customer Two",
            "username": "customertwo",
            "email": "customer.two@example.com",
            "password": "StrongPass123!",
            "role": "customer",
        }
        await async_client.post("/api/v1/auth/register", json=register_payload)

        login_response = await async_client.post(
            "/api/v1/auth/login",
            json={"username_or_email": "customertwo", "password": "StrongPass123!"},
        )
        token = login_response.json()["access_token"]
        response = await async_client.get(
            "/api/v1/auth/handyman-area",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
