import pytest
from httpx import AsyncClient
from sqlalchemy import select

from tests.integration_tests.auth.helpers import customer_payload, worker_payload
from src.app.crud.crud_worker_profiles import crud_worker_profiles
from src.app.models import CustomerProfile


@pytest.mark.integration
class TestRegisterEndpoint:

    # ── Happy path ──────────────────────────────────────────────────────────

    async def test_register_customer_success(self, async_client: AsyncClient):
        response = await async_client.post("/api/v1/auth/register", json=customer_payload())

        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "johndoe"
        assert data["email"] == "john@example.com"
        assert data["role_type"] == "customer"
        assert "id" in data
        assert "password" not in data  # never leak password
        assert "hashed_password" not in data  # never leak hash

    async def test_register_worker_success(self, async_client: AsyncClient):
        response = await async_client.post("/api/v1/auth/register", json=worker_payload())

        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "janedoe"
        assert data["role_type"] == "worker"

    # ── Duplicate detection ─────────────────────────────────────────────────

    async def test_register_duplicate_email_fails(self, async_client: AsyncClient):
        await async_client.post("/api/v1/auth/register", json=customer_payload())
        response = await async_client.post("/api/v1/auth/register", json=customer_payload(username="different_user"), )  # different username, same email
        assert response.status_code == 409
        assert "email" in response.json()["detail"].lower() or "registered" in response.json()["detail"].lower()

    async def test_register_duplicate_username_fails(self, async_client: AsyncClient):
        await async_client.post("/api/v1/auth/register", json=customer_payload())
        response = await async_client.post("/api/v1/auth/register", json=customer_payload(email="different@example.com"), )  # different email, same username
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
