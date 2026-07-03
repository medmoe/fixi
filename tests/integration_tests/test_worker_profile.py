from __future__ import annotations

from decimal import Decimal
from unittest.mock import MagicMock

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.crud.crud_worker_profile import crud_worker_profiles
from src.app.crud.crud_worker_trade import crud_worker_trades
from src.app.models import User, UserRole, WorkerProfile, TradeCategory, SkillLevel
from src.app.schemas.worker_profile import WorkerProfileCreate
from src.app.schemas.worker_trade import WorkerTradeCreate
from tests.conftest import create_test_user, create_test_trade_category


# ——————————— Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

def worker_profile_payload(**overrides) -> dict:
    defaults = {
        "bio": "Experienced plumber with 10 years of experience.",
        "years_of_experience": 10,
        "hourly_rate": 50.0,
        "service_radius_km": 10,
        "is_available": True,
    }
    return {**defaults, **overrides}


# ——————————— Fixtures ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

@pytest_asyncio.fixture
async def worker_user(async_session: AsyncSession) -> User:
    """ A user with a worker role. """
    return await create_test_user(async_session, role_type=UserRole.WORKER)


@pytest_asyncio.fixture
async def other_worker_user(async_session: AsyncSession) -> User:
    """ A second worker user — for forbidden access tests. """
    return await create_test_user(async_session, role_type=UserRole.WORKER)


@pytest_asyncio.fixture
async def customer_user(async_session: AsyncSession) -> User:
    """ A user with a customer role — should not create a worker profile. """
    return await create_test_user(async_session, role_type=UserRole.CUSTOMER)


@pytest_asyncio.fixture
async def admin_user(async_session: AsyncSession) -> User:
    """ A superuser — can update any profile. """
    return await create_test_user(async_session, is_superuser=True)


@pytest_asyncio.fixture
async def worker_profile_auth_headers(async_client: AsyncClient, worker_user: User) -> dict:
    """ Auth headers for worker user. """
    response = await async_client.post("/api/v1/auth/login", json={"username_or_email": worker_user.username, "password": "testpassword123"})
    assert response.status_code == 200, f"Login Failed: {response.json()}"
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest_asyncio.fixture
async def other_worker_profile_auth_headers(async_client: AsyncClient, other_worker_user: User) -> dict:
    """Auth headers for other_worker_user."""
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"username_or_email": other_worker_user.username, "password": "testpassword123"},
    )
    assert response.status_code == 200, f"Login Failed: {response.json()}"
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest_asyncio.fixture
async def customer_auth_headers(async_client: AsyncClient, customer_user: User) -> dict:
    """Auth headers for customer_user."""
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"username_or_email": customer_user.username, "password": "testpassword123"},
    )
    assert response.status_code == 200, f"Login Failed: {response.json()}"
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest_asyncio.fixture
async def admin_auth_headers(async_client: AsyncClient, admin_user: User) -> dict:
    """Auth headers for admin_user."""
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"username_or_email": admin_user.username, "password": "testpassword123"},
    )
    assert response.status_code == 200, f"Login Failed: {response.json()}"
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest_asyncio.fixture
async def worker_profile(async_session: AsyncSession, worker_user: User) -> WorkerProfile:
    """A worker profile owned by worker_user."""
    object_in = WorkerProfileCreate.model_validate({
        **worker_profile_payload(),
        "user_id": worker_user.id,
    })
    return await crud_worker_profiles.create(db=async_session, object=object_in)


@pytest_asyncio.fixture
async def test_trade_category(async_session: AsyncSession) -> TradeCategory:
    return await create_test_trade_category(async_session=async_session)


# ─── TestCreateWorkerProfile ──────────────────────────────────────────────────

class TestCreateWorkerProfile:
    async def test_worker_can_create_profile(self, async_client: AsyncClient, worker_profile_auth_headers: dict):
        response = await async_client.post("/api/v1/worker-profiles", json=worker_profile_payload(), headers=worker_profile_auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert "user" in data
        assert data["bio"] == worker_profile_payload()["bio"]
        assert data["years_of_experience"] == worker_profile_payload()["years_of_experience"]

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient):
        response = await async_client.post("/api/v1/worker-profiles", json=worker_profile_payload())
        assert response.status_code == 401

    async def test_customer_role_returns_403(self, async_client: AsyncClient, customer_auth_headers: dict):
        response = await async_client.post("/api/v1/worker-profiles", json=worker_profile_payload(), headers=customer_auth_headers)
        assert response.status_code == 403

    async def test_duplicate_profile_returns_409(self, async_client: AsyncClient, worker_profile_auth_headers: dict, worker_profile: WorkerProfile):  # already created for this user
        response = await async_client.post("/api/v1/worker-profiles", json=worker_profile_payload(), headers=worker_profile_auth_headers)
        assert response.status_code == 409

    async def test_invalid_hourly_rate_zero_returns_422(self, async_client: AsyncClient, worker_profile_auth_headers: dict):
        response = await async_client.post("/api/v1/worker-profiles", json=worker_profile_payload(hourly_rate=0), headers=worker_profile_auth_headers)  # must be > 0 headers=worker_profile_auth_headers,
        assert response.status_code == 422

    async def test_service_radius_out_of_range_returns_422(self, async_client: AsyncClient, worker_profile_auth_headers: dict):
        # below minimum
        response = await async_client.post("/api/v1/worker-profiles", json=worker_profile_payload(service_radius_km=0), headers=worker_profile_auth_headers)  # must be >= 1 headers=worker_profile_auth_headers
        assert response.status_code == 422

        # above maximum
        response = await async_client.post("/api/v1/worker-profiles", json=worker_profile_payload(service_radius_km=501), headers=worker_profile_auth_headers)  # must be <= 500 headers=worker_profile_auth_headers
        assert response.status_code == 422


# ─── TestGetWorkerProfile ─────────────────────────────────────────────────────

class TestGetWorkerProfile:
    async def test_public_get_returns_200(self, async_client: AsyncClient, worker_profile: WorkerProfile):
        response = await async_client.get(f"/api/v1/worker-profiles/{worker_profile.id}")
        assert response.status_code == 200

    async def test_get_includes_trades_field(self, async_client: AsyncClient, worker_profile: WorkerProfile, ):
        response = await async_client.get(f"/api/v1/worker-profiles/{worker_profile.id}")
        assert response.status_code == 200
        assert "trades" in response.json()
        assert isinstance(response.json()["trades"], list)

    async def test_nonexistent_returns_404(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/worker-profiles/99999")
        assert response.status_code == 404

    async def test_response_shape(self, async_client: AsyncClient, worker_profile: WorkerProfile, ):
        response = await async_client.get(f"/api/v1/worker-profiles/{worker_profile.id}")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "bio" in data
        assert "is_verified" in data
        assert "trades" in data
        assert "user" in data
        assert "uuid" in data["user"]

    async def test_trades_nested_with_trade_details(self, async_client: AsyncClient, async_session: AsyncSession, worker_profile: WorkerProfile, test_trade_category: TradeCategory, ):
        # assign a trade to the worker
        await crud_worker_trades.create(db=async_session, object=WorkerTradeCreate(worker_profile_id=worker_profile.id, trade_category_id=test_trade_category.id, skill_level=SkillLevel.mid, ))

        response = await async_client.get(f"/api/v1/worker-profiles/{worker_profile.id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data["trades"]) == 1
        assert data["trades"][0]["trade_id"] == test_trade_category.id
        assert data["trades"][0]["trade"] is not None
        assert data["trades"][0]["trade"]["name"] == test_trade_category.name


# ─── TestUpdateWorkerProfile ──────────────────────────────────────────────────

class TestUpdateWorkerProfile:
    async def test_owner_can_update_returns_200(self, async_client: AsyncClient, worker_profile: WorkerProfile, worker_profile_auth_headers: dict, ):
        response = await async_client.patch(f"/api/v1/worker-profiles/{worker_profile.id}", json={"bio": "Updated bio text."}, headers=worker_profile_auth_headers)
        assert response.status_code == 200
        assert response.json()["bio"] == "Updated bio text."

    async def test_admin_can_update_returns_200(self, async_client: AsyncClient, worker_profile: WorkerProfile, admin_auth_headers: dict):
        response = await async_client.patch(f"/api/v1/worker-profiles/{worker_profile.id}", json={"bio": "Admin updated this."}, headers=admin_auth_headers, )
        assert response.status_code == 200
        assert response.json()["bio"] == "Admin updated this."

    async def test_other_user_returns_403(self, async_client: AsyncClient, worker_profile: WorkerProfile, other_worker_profile_auth_headers: dict):
        response = await async_client.patch(f"/api/v1/worker-profiles/{worker_profile.id}", json={"bio": "Trying to hijack."}, headers=other_worker_profile_auth_headers, )
        assert response.status_code == 403

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient, worker_profile: WorkerProfile, ):
        response = await async_client.patch(f"/api/v1/worker-profiles/{worker_profile.id}", json={"bio": "No token."}, )
        assert response.status_code == 401

    async def test_partial_update_only_changes_sent_fields(self, async_client: AsyncClient, worker_profile: WorkerProfile, worker_profile_auth_headers: dict, ):
        original_rate = worker_profile.hourly_rate
        response = await async_client.patch(f"/api/v1/worker-profiles/{worker_profile.id}", json={"bio": "Only bio changed."}, headers=worker_profile_auth_headers, )
        assert response.status_code == 200
        data = response.json()
        assert data["bio"] == "Only bio changed."
        # hourly_rate should be unchanged
        assert Decimal(data["hourly_rate"]) == original_rate

    async def test_nonexistent_profile_returns_404(self, async_client: AsyncClient, worker_profile_auth_headers: dict, ):
        response = await async_client.patch("/api/v1/worker-profiles/99999", json={"bio": "Does not exist."}, headers=worker_profile_auth_headers)
        assert response.status_code == 404


# ─── TestUploadAvatar ─────────────────────────────────────────────────────────

class TestUploadAvatar:
    async def test_owner_can_upload_avatar_returns_200_with_url(self, async_client: AsyncClient, worker_profile: WorkerProfile, worker_profile_auth_headers: dict, monkeypatch: pytest.MonkeyPatch, ):
        # stub minio upload — prevents MinIO dependency in tests
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", MagicMock(return_value=None))

        fake_image = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100  # fake PNG bytes
        response = await async_client.post(f"/api/v1/worker-profiles/{worker_profile.id}/avatar", headers=worker_profile_auth_headers, files={"file": ("avatar.png", fake_image, "image/png")})
        assert response.status_code == 200
        assert "avatar_url" in response.json()
        assert "avatars/" in response.json()["avatar_url"]

    async def test_non_owner_returns_403(self, async_client: AsyncClient, worker_profile: WorkerProfile, other_worker_profile_auth_headers: dict, monkeypatch: pytest.MonkeyPatch, ):
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", MagicMock(return_value=None))
        fake_image = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        response = await async_client.post(f"/api/v1/worker-profiles/{worker_profile.id}/avatar", headers=other_worker_profile_auth_headers, files={"file": ("avatar.png", fake_image, "image/png")})
        assert response.status_code == 403

    async def test_invalid_mime_returns_400(self, async_client: AsyncClient, worker_profile: WorkerProfile, worker_profile_auth_headers: dict):
        # send PDF bytes with PDF content type
        fake_pdf = b"%PDF-1.4 fake pdf content"
        response = await async_client.post(f"/api/v1/worker-profiles/{worker_profile.id}/avatar", headers=worker_profile_auth_headers, files={"file": ("document.pdf", fake_pdf, "application/pdf")})
        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]

    async def test_response_contains_avatar_url(self, async_client: AsyncClient, worker_profile: WorkerProfile, worker_profile_auth_headers: dict, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", MagicMock(return_value=None))
        fake_image = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        response = await async_client.post(f"/api/v1/worker-profiles/{worker_profile.id}/avatar", headers=worker_profile_auth_headers, files={"file": ("avatar.png", fake_image, "image/png")}, )
        assert response.status_code == 200
        url = response.json()["avatar_url"]
        assert url.startswith("http")
        assert "avatars/" in url
        assert str(worker_profile.id) in url
