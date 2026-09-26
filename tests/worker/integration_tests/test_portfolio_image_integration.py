from __future__ import annotations

from io import BytesIO
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import PortfolioImage, WorkerProfile


def _real_png() -> bytes:
    """A decodable PNG -- uploads are re-encoded by sanitize_image, so fake header-only bytes are rejected."""
    buffer = BytesIO()
    Image.new("RGB", (10, 10), color="red").save(buffer, format="PNG")
    return buffer.getvalue()


class TestPortfolioImageIntegration:
    # ──────── Test Upload Portfolio Image ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    @pytest.mark.integration
    async def test_upload_portfolio_image_success_as_owner(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, auth_headers: dict, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", MagicMock(return_value=None))
        fake_portfolio_image = _real_png()
        response = await async_client.post("/api/v1/worker-profile/portfolio-images", headers=auth_headers, files={"file": ("portfolio.png", fake_portfolio_image, "image/png")})
        print(response.json())
        assert response.status_code == 201
        data = response.json()
        assert "worker_profile_id" in data and data["worker_profile_id"] == test_worker_profile.id
        assert "image_url" in data and data["image_url"] is not None
        assert "created_at" in data and data["created_at"] is not None

    @pytest.mark.integration
    async def test_upload_portfolio_image_for_non_owner_returns_404(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, other_auth_headers: dict, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", MagicMock(return_value=None))
        fake_portfolio_image = _real_png()
        response = await async_client.post("/api/v1/worker-profile/portfolio-images", headers=other_auth_headers, files={"file": ("portfolio.png", fake_portfolio_image, "image/png")})
        assert response.status_code == 404

    @pytest.mark.integration
    async def test_upload_portfolio_image_unauthorized_if_not_logged_in(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", MagicMock(return_value=None))
        fake_portfolio_image = _real_png()
        response = await async_client.post("/api/v1/worker-profile/portfolio-images", files={"file": ("portfolio.png", fake_portfolio_image, "image/png")})
        assert response.status_code == 401

    @pytest.mark.integration
    async def test_upload_portfolio_image_returns_404_for_nonexistent_profile(self, async_client: AsyncClient, monkeypatch: pytest.MonkeyPatch, auth_headers: dict):
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", MagicMock(return_value=None))
        fake_portfolio_image = _real_png()
        response = await async_client.post("/api/v1/worker-profile/portfolio-images", headers=auth_headers, files={"file": ("portfolio.png", fake_portfolio_image, "image/png")})
        assert response.status_code == 404

    @pytest.mark.integration
    async def test_upload_fails_when_max_portfolio_images_reached(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, monkeypatch: pytest.MonkeyPatch, test_portfolio_images: list[PortfolioImage], auth_headers: dict):
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", MagicMock(return_value=None))
        fake_portfolio_image = _real_png()
        res = await async_client.post("/api/v1/worker-profile/portfolio-images", headers=auth_headers, files={"file": ("portfolio.png", fake_portfolio_image, "image/png")})
        assert res.status_code == 400

    @pytest.mark.integration
    async def test_uploaded_image_is_stored_without_gps_exif(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, auth_headers: dict, monkeypatch: pytest.MonkeyPatch):
        upload = MagicMock(return_value=None)
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", upload)
        photo = Image.new("RGB", (20, 20), color="green")
        exif = Image.Exif()
        exif[0x8825] = {1: "N", 2: (36.0, 45.0, 10.0), 3: "E", 4: (3.0, 3.0, 30.0)}  # GPS IFD
        buffer = BytesIO()
        photo.save(buffer, format="JPEG", exif=exif.tobytes())

        res = await async_client.post("/api/v1/worker-profile/portfolio-images", headers=auth_headers, files={"file": ("site.jpg", buffer.getvalue(), "image/jpeg")})

        assert res.status_code == 201
        stored = upload.call_args.kwargs
        assert stored["content_type"] == "image/jpeg"
        with Image.open(BytesIO(stored["data"])) as img:
            assert len(img.getexif()) == 0

    @pytest.mark.integration
    async def test_each_upload_gets_its_own_object_key(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, auth_headers: dict, monkeypatch: pytest.MonkeyPatch):
        # Regression: keys used to be portfolio_images/{user_id}.{ext}, so every upload overwrote the last.
        upload = MagicMock(return_value=None)
        monkeypatch.setattr("src.app.services.minio_client.minio_client.upload_file", upload)

        first = await async_client.post("/api/v1/worker-profile/portfolio-images", headers=auth_headers, files={"file": ("a.png", _real_png(), "image/png")})
        second = await async_client.post("/api/v1/worker-profile/portfolio-images", headers=auth_headers, files={"file": ("a.png", _real_png(), "image/png")})

        assert first.status_code == second.status_code == 201
        keys = [call.kwargs["key"] for call in upload.call_args_list]
        assert len(set(keys)) == 2
        assert first.json()["image_url"] != second.json()["image_url"]
        assert all(k.startswith(f"portfolio_images/{test_worker_profile.user_id}/") for k in keys)

    # ─────────── Test Get Portfolio Image ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    @pytest.mark.integration
    async def test_get_portfolio_image_success(self, async_client: AsyncClient, test_worker_profile, auth_headers: dict, test_portfolio_images: list[PortfolioImage]):
        """Happy Path: Profile owner can fetch a single specific portfolio image asset."""
        response = await async_client.get(f"/api/v1/worker-profile/{test_worker_profile.id}/portfolio-images/{test_portfolio_images[0].id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["image_url"] == test_portfolio_images[0].image_url

    @pytest.mark.integration
    async def test_get_portfolio_image_returns_404_if_worker_profile_does_not_exist(self, async_client: AsyncClient, test_portfolio_images: list[PortfolioImage], auth_headers: dict):
        res = await async_client.get(f"/api/v1/worker-profile/99999/portfolio-images/{test_portfolio_images[0].id}", headers=auth_headers)
        assert res.status_code == 404

    @pytest.mark.integration
    async def test_get_portfolio_image_returns_404_if_image_does_not_exist(self, async_client: AsyncClient, test_worker_profile: WorkerProfile, auth_headers: dict):
        """Sad Path: Querying an image ID that does not exist returns a 404."""
        response = await async_client.get(f"/api/v1/worker-profile/{test_worker_profile.id}/portfolio-images/99999", headers=auth_headers)
        assert response.status_code == 404

    # ───────────── Test Get Portfolio Images ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

    @pytest.mark.integration
    async def test_get_portfolio_images_success(self, async_client: AsyncClient, test_worker_profile, test_portfolio_images: list[PortfolioImage], auth_headers):
        """Happy Path: Fetching the image array returns all assets belonging *only* to this profile."""
        response = await async_client.get(f"/api/v1/worker-profile/{test_worker_profile.id}/portfolio-images", headers=auth_headers)

        assert response.status_code == 200
        expected = sum([1 for p_img in test_portfolio_images if p_img.worker_profile_id == test_worker_profile.id])
        data = response.json()
        assert len(data) == expected
        assert all(p_img["worker_profile_id"] == test_worker_profile.id for p_img in data)

    @pytest.mark.integration
    async def test_get_portfolio_images_returns_404_if_worker_profile_does_not_exist(self, async_client: AsyncClient, async_session: AsyncSession, test_worker_profile, auth_headers: dict):
        """Happy Path: Returns an empty list `[]` with a 200 status code if the profile has no images yet."""
        response = await async_client.get("/api/v1/worker-profile/99999/portfolio-images", headers=auth_headers)
        assert response.status_code == 404

    # ───────────── Test Delete Portfolio Image ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

    @pytest.mark.integration
    async def test_delete_portfolio_image_returns_404_if_worker_profile_does_not_exist(self, async_client: AsyncClient, test_portfolio_images: list[PortfolioImage], other_auth_headers: dict):
        """Happy Path: Returns a 404 status code if the worker profile does not exist."""
        res = await async_client.delete(f"/api/v1/worker-profile/portfolio-images/{test_portfolio_images[0].id}", headers=other_auth_headers)
        assert res.status_code == 404

    @pytest.mark.integration
    async def test_delete_portfolio_image_for_non_owner_return_404(self, async_client: AsyncClient, test_portfolio_images: list[PortfolioImage], auth_headers: dict, test_worker_profile: WorkerProfile):
        non_owner_images = [image for image in test_portfolio_images if image.worker_profile_id != test_worker_profile.id]
        res = await async_client.delete(f"/api/v1/worker-profile/portfolio-images/{non_owner_images[0].id}", headers=auth_headers)
        assert res.status_code == 404

    @pytest.mark.integration
    async def test_delete_portfolio_image_successful(self, async_client: AsyncClient, test_portfolio_images: list[PortfolioImage], auth_headers: dict, test_worker_profile: WorkerProfile):
        images_to_delete = [image for image in test_portfolio_images if image.worker_profile_id == test_worker_profile.id]
        image_to_delete = images_to_delete[0].id
        res = await async_client.delete(f"/api/v1/worker-profile/portfolio-images/{image_to_delete}", headers=auth_headers)
        assert res.status_code == 204
        response = await async_client.get(f"/api/v1/worker-profile/{test_worker_profile.id}/portfolio-images/{image_to_delete}", headers=auth_headers)
        assert response.status_code == 404
