from __future__ import annotations

from decimal import Decimal
from io import BytesIO
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.crud.crud_workers_trades import crud_worker_trades
from src.app.models import SkillLevel, TradeCategory, WorkerProfile
from src.app.schemas.worker_trade import WorkerTradeCreate


def _real_png() -> bytes:
    """A decodable PNG -- uploads are re-encoded by sanitize_image, so fake header-only bytes are rejected."""
    buffer = BytesIO()
    Image.new("RGB", (10, 10), color="red").save(buffer, format="PNG")
    return buffer.getvalue()


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
        response = await async_client.get("/api/v1/worker-profile", headers=auth_headers)
        assert response.status_code == 200

    async def test_get_includes_trade_categories_field(self, async_client: AsyncClient, auth_headers: dict, test_worker_profile: WorkerProfile):
        response = await async_client.get("/api/v1/worker-profile", headers=auth_headers)
        assert response.status_code == 200
        assert "trade_categories" in response.json()
        assert isinstance(response.json()["trade_categories"], list)

    async def test_nonexistent_returns_404(self, async_client: AsyncClient, auth_headers: dict):
        response = await async_client.get("/api/v1/worker-profile", headers=auth_headers)
        assert response.status_code == 404

    async def test_has_cni_document_false_when_none_uploaded(self, async_client: AsyncClient, auth_headers: dict, test_worker_profile: WorkerProfile):
        response = await async_client.get("/api/v1/worker-profile", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["has_cni_document"] is False

    async def test_has_cni_document_true_after_upload(
            self, async_client: AsyncClient, async_session: AsyncSession, auth_headers: dict, test_worker_profile: WorkerProfile
    ):
        test_worker_profile.cni_document_key = "cni/1.pdf"
        await async_session.commit()

        response = await async_client.get("/api/v1/worker-profile", headers=auth_headers)

        assert response.status_code == 200
        assert response.json()["has_cni_document"] is True

    async def test_cni_document_key_never_appears_in_the_response(
            self, async_client: AsyncClient, async_session: AsyncSession, auth_headers: dict, test_worker_profile: WorkerProfile
    ):
        test_worker_profile.cni_document_key = "cni/1.pdf"
        await async_session.commit()

        response = await async_client.get("/api/v1/worker-profile", headers=auth_headers)

        assert "cni_document_key" not in response.json()

    async def test_response_shape(self, async_client: AsyncClient, auth_headers: dict, test_worker_profile: WorkerProfile):
        response = await async_client.get("/api/v1/worker-profile", headers=auth_headers)
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

        response = await async_client.get("/api/v1/worker-profile", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["trade_categories"]) == 1
        assert data["trade_categories"][0]["trade_category_id"] == test_trade_category.id
        assert data["trade_categories"][0]["trade_category"] is not None
        assert data["trade_categories"][0]["trade_category"]["name"] == test_trade_category.name


# ─── TestUpdateWorkerProfile ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

class TestUpdateWorkerProfile:
    async def test_owner_can_update_returns_200(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, auth_headers: dict, ):
        response = await async_client.patch("/api/v1/worker-profile", json={"bio": "Updated bio text."}, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["bio"] == "Updated bio text."

    async def test_other_user_returns_404(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, other_auth_headers: dict):
        response = await async_client.patch("/api/v1/worker-profile", json={"bio": "Trying to hijack."}, headers=other_auth_headers, )
        assert response.status_code == 404

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, ):
        response = await async_client.patch("/api/v1/worker-profile", json={"bio": "No token."}, )
        assert response.status_code == 401

    async def test_partial_update_only_changes_sent_fields(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, auth_headers: dict, ):
        original_rate = test_worker_profile.hourly_rate
        response = await async_client.patch("/api/v1/worker-profile", json={"bio": "Only bio changed."}, headers=auth_headers, )
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

        fake_image = _real_png()
        response = await async_client.post("/api/v1/worker-profile/avatar", headers=auth_headers, files={"file": ("avatar.png", fake_image, "image/png")})
        assert response.status_code == 200
        assert "avatar_url" in response.json()
        assert "avatars/" in response.json()["avatar_url"]

    async def test_non_owner_returns_404(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, other_auth_headers: dict, monkeypatch: pytest.MonkeyPatch, ):
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", MagicMock(return_value=None))
        fake_image = _real_png()
        response = await async_client.post("/api/v1/worker-profile/avatar", headers=other_auth_headers, files={"file": ("avatar.png", fake_image, "image/png")})
        assert response.status_code == 404

    async def test_invalid_mime_returns_400(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, auth_headers: dict):
        # send PDF bytes with PDF content type
        fake_pdf = b"%PDF-1.4 fake pdf content"
        response = await async_client.post("/api/v1/worker-profile/avatar", headers=auth_headers, files={"file": ("document.pdf", fake_pdf, "application/pdf")})
        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]

    async def test_response_contains_avatar_url(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, auth_headers: dict, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", MagicMock(return_value=None))
        fake_image = _real_png()
        response = await async_client.post("/api/v1/worker-profile/avatar", headers=auth_headers, files={"file": ("avatar.png", fake_image, "image/png")}, )
        assert response.status_code == 200
        url = response.json()["avatar_url"]
        assert url.startswith("http")
        assert "avatars/" in url
        assert f"avatars/{test_worker_profile.user_id}/" in url  # _upload_image_file keys the file by user_id, not profile id


# ─── TestUploadCniDocument ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

class TestUploadCniDocument:
    async def test_owner_can_upload_returns_200(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, auth_headers: dict, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.app.services.minio_client.minio_client.ensure_private_bucket_exists", MagicMock(return_value=None))
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", MagicMock(return_value=None))

        fake_pdf = b"%PDF-1.4 fake cni content"
        response = await async_client.post("/api/v1/worker-profile/cni-document", headers=auth_headers, files={"file": ("cni.pdf", fake_pdf, "application/pdf")})

        assert response.status_code == 200

    async def test_accepts_images_too(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, auth_headers: dict, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.app.services.minio_client.minio_client.ensure_private_bucket_exists", MagicMock(return_value=None))
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", MagicMock(return_value=None))

        fake_image = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        response = await async_client.post("/api/v1/worker-profile/cni-document", headers=auth_headers, files={"file": ("cni.png", fake_image, "image/png")})

        assert response.status_code == 200

    async def test_non_owner_returns_404(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, other_auth_headers: dict, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.app.services.minio_client.minio_client.ensure_private_bucket_exists", MagicMock(return_value=None))
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", MagicMock(return_value=None))

        fake_pdf = b"%PDF-1.4 fake cni content"
        response = await async_client.post("/api/v1/worker-profile/cni-document", headers=other_auth_headers, files={"file": ("cni.pdf", fake_pdf, "application/pdf")})

        assert response.status_code == 404

    async def test_invalid_mime_returns_400(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, auth_headers: dict):
        fake_text = b"just some text, not a real document"
        response = await async_client.post("/api/v1/worker-profile/cni-document", headers=auth_headers, files={"file": ("notes.txt", fake_text, "text/plain")})

        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]

    async def test_unauthenticated_returns_401(self, async_client: AsyncClient, test_worker_profile: WorkerProfile):
        fake_pdf = b"%PDF-1.4 fake cni content"
        response = await async_client.post("/api/v1/worker-profile/cni-document", files={"file": ("cni.pdf", fake_pdf, "application/pdf")})

        assert response.status_code == 401

    async def test_uploads_to_the_private_verification_bucket(self, async_client: AsyncClient, async_session: AsyncSession, test_worker_profile: WorkerProfile, auth_headers: dict, monkeypatch: pytest.MonkeyPatch):
        from src.app.core.config import settings

        upload_mock = MagicMock(return_value=None)
        monkeypatch.setattr("src.app.services.minio_client.minio_client.ensure_private_bucket_exists", MagicMock(return_value=None))
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", upload_mock)

        fake_pdf = b"%PDF-1.4 fake cni content"
        response = await async_client.post("/api/v1/worker-profile/cni-document", headers=auth_headers, files={"file": ("cni.pdf", fake_pdf, "application/pdf")})

        assert response.status_code == 200
        upload_mock.assert_called_once()
        assert upload_mock.call_args.kwargs["bucket"] == settings.APP_S3_BUCKET_VERIFICATION
        assert f"cni/{test_worker_profile.user_id}" in upload_mock.call_args.kwargs["key"]

        await async_session.refresh(test_worker_profile)
        assert test_worker_profile.cni_document_key is not None


class TestGetWorkerProfilePublic:
    """GET /worker-profile/{worker_profile_id} — Public endpoint"""

    async def test_get_worker_profile_success(self, async_client: AsyncClient, worker_available):
        response = await async_client.get(f"/api/v1/worker-profile/{worker_available.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == worker_available.id

    async def test_get_worker_profile_unauthenticated_succeeds(
            self, async_client: AsyncClient, worker_available
    ):
        """Public endpoint — no token required."""
        response = await async_client.get(f"/api/v1/worker-profile/{worker_available.id}")
        assert response.status_code == 200

    async def test_get_nonexistent_worker_profile_returns_404(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/worker-profile/999999")
        assert response.status_code == 404

    async def test_response_includes_user_info(self, async_client: AsyncClient, worker_available):
        response = await async_client.get(f"/api/v1/worker-profile/{worker_available.id}")
        data = response.json()
        assert "user" in data
        assert "name" in data["user"]

    async def test_response_includes_trade_categories(
            self, async_client: AsyncClient, worker_with_plumbing
    ):
        response = await async_client.get(f"/api/v1/worker-profile/{worker_with_plumbing.id}")
        data = response.json()
        assert "trade_categories" in data
        assert len(data["trade_categories"]) == 1
        assert data["trade_categories"][0]["trade_category"]["display_name"] == "Plumbing"

    async def test_response_with_no_trade_categories_returns_empty_list(
            self, async_client: AsyncClient, worker_available
    ):
        """worker_available has no WorkerTrade rows — trade_categories should be []."""
        response = await async_client.get(f"/api/v1/worker-profile/{worker_available.id}")
        data = response.json()
        assert data["trade_categories"] == []

    async def test_response_reflects_availability(
            self, async_client: AsyncClient, worker_with_plumbing, worker_with_plumbing_unavailable
    ):
        response_available = await async_client.get(f"/api/v1/worker-profile/{worker_with_plumbing.id}")
        response_unavailable = await async_client.get(
            f"/api/v1/worker-profile/{worker_with_plumbing_unavailable.id}"
        )
        assert response_available.json()["is_available"] is True
        assert response_unavailable.json()["is_available"] is False

    async def test_response_reflects_verification_status(
            self, async_client: AsyncClient, worker_verified, worker_unverified
    ):
        response_verified = await async_client.get(f"/api/v1/worker-profile/{worker_verified.id}")
        response_unverified = await async_client.get(f"/api/v1/worker-profile/{worker_unverified.id}")
        assert response_verified.json()["is_verified"] is True
        assert response_unverified.json()["is_verified"] is False

    async def test_response_includes_hourly_rate(self, async_client: AsyncClient, worker_mid_rate):
        response = await async_client.get(f"/api/v1/worker-profile/{worker_mid_rate.id}")
        data = response.json()
        assert Decimal(data["hourly_rate"]) == Decimal("75.00")

    async def test_response_includes_years_of_experience(
            self, async_client: AsyncClient, worker_senior
    ):
        response = await async_client.get(f"/api/v1/worker-profile/{worker_senior.id}")
        data = response.json()
        assert data["years_of_experience"] == 10

    async def test_response_includes_service_radius(
            self, async_client: AsyncClient, worker_large_radius
    ):
        response = await async_client.get(f"/api/v1/worker-profile/{worker_large_radius.id}")
        data = response.json()
        assert data["service_radius_km"] == 100

    async def test_negative_id_returns_404(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/worker-profile/-1")
        assert response.status_code == 404

    async def test_non_integer_id_returns_422(self, async_client: AsyncClient):
        response = await async_client.get("/api/v1/worker-profile/not-a-number")
        assert response.status_code == 422
