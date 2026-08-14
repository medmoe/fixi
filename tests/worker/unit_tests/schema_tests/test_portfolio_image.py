from typing import Any

import pytest
from pydantic import ValidationError

from src.app.schemas.portfolio_image import PortfolioImageCreate, PortfolioImageRead
from tests.conftest import fake

IMAGE_URL = fake.image_url()


# ———————— Fixtures and Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
def create_payload(**overrides: dict[str, Any]) -> dict[str, Any]:
    return {
        "worker_profile_id": 1,
        "image_url": IMAGE_URL,
        **overrides
    }


def read_payload(**overrides: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": 1,
        "worker_profile_id": 1,
        "image_url": IMAGE_URL,
        "created_at": fake.date_time(),
        **overrides
    }


# ———————— PortfolioImageCreate ————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

class TestPortfolioImageCreate:
    @pytest.mark.unit
    def test_valid_payload_passes(self):
        schema = PortfolioImageCreate(**create_payload())
        assert schema.worker_profile_id == 1
        assert schema.image_url == IMAGE_URL

    @pytest.mark.unit
    def test_missing_worker_profile_id_fails(self):
        payload = create_payload()
        del payload["worker_profile_id"]
        with pytest.raises(ValidationError):
            PortfolioImageCreate(**payload)

    @pytest.mark.unit
    def test_missing_image_url_fails(self):
        payload = create_payload()
        del payload["image_url"]
        with pytest.raises(ValidationError):
            PortfolioImageCreate(**payload)

    @pytest.mark.unit
    def test_not_valid_image_url_fails(self):
        payload = create_payload()
        payload["image_url"] = "not a valid url"
        with pytest.raises(ValidationError):
            PortfolioImageCreate(**payload)

    @pytest.mark.unit
    def test_payload_with_extra_variables_fails(self):
        payload = create_payload()
        payload["extra_variable"] = "extra value"
        with pytest.raises(ValidationError):
            PortfolioImageCreate(**payload)

    @pytest.mark.unit
    def test_image_url_exceeds_max_length_fails(self):
        payload = create_payload()
        payload["image_url"] = "a" * 256
        with pytest.raises(ValidationError):
            PortfolioImageCreate(**payload)


class TestPortfolioImageRead:

    @pytest.mark.unit
    def test_valid_payload_passes(self):
        schema = PortfolioImageRead(**read_payload())
        assert schema.worker_profile_id == 1
        assert schema.image_url == IMAGE_URL
        assert schema.id == 1
        assert schema.created_at is not None

    @pytest.mark.unit
    def test_missing_id_fails(self):
        payload = read_payload()
        del payload["id"]
        with pytest.raises(ValidationError):
            PortfolioImageRead(**payload)

    @pytest.mark.unit
    def test_extra_variables_fails(self):
        payload = read_payload()
        payload["extra_variable"] = "extra value"
        with pytest.raises(ValidationError):
            PortfolioImageRead(**payload)

    @pytest.mark.unit
    def test_missing_created_at_fails(self):
        payload = read_payload()
        del payload["created_at"]
        with pytest.raises(ValidationError):
            PortfolioImageRead(**payload)
