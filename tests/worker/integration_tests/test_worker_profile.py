from __future__ import annotations

from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.crud.crud_workers_trades import crud_worker_trades
from src.app.models import WorkerProfile, TradeCategory, SkillLevel
from src.app.schemas.worker_trade import WorkerTradeCreate


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


# ─── TestGetWorkerProfile ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

class TestGetWorkerProfile:
    async def test_public_get_returns_200(self, async_client: AsyncClient, auth_headers: dict, test_worker_profile: WorkerProfile):
        response = await async_client.get(f"/api/v1/worker-profile", headers=auth_headers)
        assert response.status_code == 200

    async def test_get_includes_trade_categories_field(self, async_client: AsyncClient, auth_headers: dict, test_worker_profile: WorkerProfile):
        response = await async_client.get(f"/api/v1/worker-profile", headers=auth_headers)
        assert response.status_code == 200
        assert "trade_categories" in response.json()
        assert isinstance(response.json()["trade_categories"], list)

    async def test_nonexistent_returns_404(self, async_client: AsyncClient, auth_headers: dict):
        response = await async_client.get("/api/v1/worker-profile", headers=auth_headers)
        assert response.status_code == 404

    async def test_response_shape(self, async_client: AsyncClient, auth_headers: dict, test_worker_profile: WorkerProfile):
        response = await async_client.get(f"/api/v1/worker-profile", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "bio" in data
        assert "is_verified" in data
        assert "trade_categories" in data
        assert "user" in data

    async def test_trades_nested_with_trade_details(
            self,
            async_client: AsyncClient,
            async_session: AsyncSession,
            test_worker_profile: WorkerProfile,
            test_trade_category: TradeCategory,
            auth_headers: dict
    ):
        # assign a trade to the worker
        await crud_worker_trades.create(
            db=async_session,
            object=WorkerTradeCreate(
                worker_profile_id=test_worker_profile.id,
                trade_category_id=test_trade_category.id,
                skill_level=SkillLevel.mid,
            )
        )

        response = await async_client.get(f"/api/v1/worker-profile", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["trade_categories"]) == 1
        assert data["trade_categories"][0]["trade_category_id"] == test_trade_category.id
        assert data["trade_categories"][0]["trade_category"] is not None
        assert data["trade_categories"][0]["trade_category"]["name"] == test_trade_category.name


# ─── TestUpdateWorkerProfile ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

class TestUpdateWorkerProfile:
    async def test_owner_can_update_returns_200(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, auth_headers: dict, ):
        response = await async_client.patch(f"/api/v1/worker-profile", json={"bio": "Updated bio text."}, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["bio"] == "Updated bio text."

    async def test_other_user_returns_404(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, other_auth_headers: dict):
        response = await async_client.patch(f"/api/v1/worker-profile", json={"bio": "Trying to hijack."}, headers=other_auth_headers, )
        assert response.status_code == 404

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, ):
        response = await async_client.patch(f"/api/v1/worker-profile", json={"bio": "No token."}, )
        assert response.status_code == 401

    async def test_partial_update_only_changes_sent_fields(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, auth_headers: dict, ):
        original_rate = test_worker_profile.hourly_rate
        response = await async_client.patch(f"/api/v1/worker-profile", json={"bio": "Only bio changed."}, headers=auth_headers, )
        assert response.status_code == 200
        data = response.json()
        print(data)
        assert data["bio"] == "Only bio changed."
        # hourly_rate should be unchanged
        assert Decimal(data["hourly_rate"]) == original_rate

    async def test_nonexistent_profile_returns_404(self, async_client: AsyncClient, auth_headers: dict, ):
        response = await async_client.patch("/api/v1/worker-profiles/99999", json={"bio": "Does not exist."}, headers=auth_headers)
        assert response.status_code == 404


# ─── TestUploadAvatar ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

class TestUploadAvatar:
    async def test_owner_can_upload_avatar_returns_200_with_url(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, auth_headers: dict, monkeypatch: pytest.MonkeyPatch, ):
        # stub minio upload — prevents MinIO dependency in tests
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", MagicMock(return_value=None))

        fake_image = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100  # fake PNG bytes
        response = await async_client.post(f"/api/v1/worker-profile/avatar", headers=auth_headers, files={"file": ("avatar.png", fake_image, "image/png")})
        assert response.status_code == 200
        assert "avatar_url" in response.json()
        assert "avatars/" in response.json()["avatar_url"]

    async def test_non_owner_returns_404(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, other_auth_headers: dict, monkeypatch: pytest.MonkeyPatch, ):
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", MagicMock(return_value=None))
        fake_image = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        response = await async_client.post(f"/api/v1/worker-profile/avatar", headers=other_auth_headers, files={"file": ("avatar.png", fake_image, "image/png")})
        assert response.status_code == 404

    async def test_invalid_mime_returns_400(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, auth_headers: dict):
        # send PDF bytes with PDF content type
        fake_pdf = b"%PDF-1.4 fake pdf content"
        response = await async_client.post(f"/api/v1/worker-profile/avatar", headers=auth_headers, files={"file": ("document.pdf", fake_pdf, "application/pdf")})
        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]

    async def test_response_contains_avatar_url(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, auth_headers: dict, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", MagicMock(return_value=None))
        fake_image = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        response = await async_client.post(f"/api/v1/worker-profile/avatar", headers=auth_headers, files={"file": ("avatar.png", fake_image, "image/png")}, )
        assert response.status_code == 200
        url = response.json()["avatar_url"]
        assert url.startswith("http")
        assert "avatars/" in url
        assert str(test_worker_profile.id) in url
