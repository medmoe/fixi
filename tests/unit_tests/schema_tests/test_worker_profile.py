"""
Tests for WorkerProfile Pydantic schemas.

Schemas tested:
    - WorkerProfileCreate
    - WorkerProfileUpdate
    - WorkerProfileRead
"""

import uuid
from decimal import Decimal
from typing import Any

import pytest
from pydantic import ValidationError
from tests.conftest import fake
from src.app.models import UserRole
from src.app.schemas.worker_profile import (
    WorkerProfileUpdate,
    WorkerProfileRead,
    WorkerProfileDelete,
    WorkerProfileBase,
    WorkerProfileNestedRead
)


# ===========================================================================
# Fixtures & Factories
# ===========================================================================

IMAGE_URL = fake.image_url()
PORTFOLIO_IMAGES_COUNT = 5
def create_payload(**overrides) -> dict:
    """Minimal valid payload for WorkerProfileCreate."""
    return {
        "bio": "Experienced plumber with 10 years of experience.",
        "years_of_experience": 10,
        "hourly_rate": Decimal("75.00"),
        "service_radius_km": 20,
        "avatar_url": "https://example.com/avatar.jpg",
        "is_available": True,
        **overrides,
    }


def create_user_payload(**overrides) -> dict:
    """Minimal valid payload for WorkerProfileCreate."""
    return {
        "username": "john123",
        "email": "john@example.com",
        "id": 42,
        "name": "John Doe",
        "uuid": uuid.uuid4(),
        "profile_image_url": "https://example.com/avatar.jpg",
        "role_type": UserRole.WORKER,
        **overrides,
    }

def create_portfolio_images_payload(**overrides) -> list[dict[str, Any]]:
    """Minimal valid payload for PortfolioImageCreate."""
    return [{
        "id": i,
        "worker_profile_id": 1,
        "image_url": IMAGE_URL,
        "created_at": fake.date_time(),
        **overrides,
    } for i in range(PORTFOLIO_IMAGES_COUNT)]


def update_payload(**overrides) -> dict:
    """Minimal valid payload for WorkerProfileUpdate (all fields optional)."""
    return {**overrides}


def read_payload(**overrides) -> dict:
    """Valid payload for WorkerProfileRead (includes read-only fields)."""
    return {
        **create_payload(),
        "id": 1,
        "user_id": 42,
        "is_verified": False,
        **overrides,
    }


def delete_payload(**overrides) -> dict:
    return {
        "id": 1,
        **overrides,
    }


def nested_payload() -> dict:
    return {
        **create_payload(id=1, is_verified=True),
        "user": create_user_payload(),
        "portfolio_images": create_portfolio_images_payload()
    }


# ===========================================================================
# WorkerProfileCreate
# ===========================================================================

class TestWorkerProfileCreate:
    """
    WorkerProfileCreate is used when a worker submits their profile for the
    first time. user_id comes from JWT — not the request body.
    is_verified is admin-only — not exposed here.
    """

    # ── Happy path ───────────────────────────────────────────────────────────

    class TestValidPayloads:

        def test_full_valid_payload_passes(self):
            schema = WorkerProfileBase(**create_payload())
            assert schema.bio == "Experienced plumber with 10 years of experience."
            assert schema.hourly_rate == Decimal("75.00")

        def test_all_optional_fields_omitted_passes(self):
            """Only required fields — all optional fields should fall back to defaults."""
            schema = WorkerProfileBase()
            assert schema.bio is None
            assert schema.is_available is True

        def test_is_available_defaults_to_true(self):
            schema = WorkerProfileBase()
            assert schema.is_available is True

    # ── Field: bio ───────────────────────────────────────────────────────────

    class TestBioField:

        def test_bio_max_length_passes(self):
            schema = WorkerProfileBase(**create_payload(bio="A" * 1000))
            if schema.bio:
                assert len(schema.bio) == 1000

        def test_bio_exceeds_max_length_fails(self):
            with pytest.raises(ValidationError) as exc:
                WorkerProfileBase(**create_payload(bio="A" * 1001))
            assert "bio" in str(exc.value)

        def test_bio_none_passes(self):
            schema = WorkerProfileBase(**create_payload(bio=None))
            assert schema.bio is None

    # ── Field: years_of_experience ───────────────────────────────────────────

    class TestYearsOfExperienceField:

        def test_zero_years_passes(self):
            schema = WorkerProfileBase(**create_payload(years_of_experience=0))
            assert schema.years_of_experience == 0

        def test_max_years_passes(self):
            schema = WorkerProfileBase(**create_payload(years_of_experience=100))
            assert schema.years_of_experience == 100

        def test_negative_years_fails(self):
            with pytest.raises(ValidationError) as exc:
                WorkerProfileBase(**create_payload(years_of_experience=-1))
            assert "years_of_experience" in str(exc.value)

        def test_exceeds_max_years_fails(self):
            with pytest.raises(ValidationError) as exc:
                WorkerProfileBase(**create_payload(years_of_experience=101))
            assert "years_of_experience" in str(exc.value)

    # ── Field: hourly_rate ───────────────────────────────────────────────────

    class TestHourlyRateField:

        def test_valid_decimal_rate_passes(self):
            schema = WorkerProfileBase(**create_payload(hourly_rate=Decimal("99.99")))
            assert schema.hourly_rate == Decimal("99.99")

        def test_zero_rate_passes(self):
            schema = WorkerProfileBase(**create_payload(hourly_rate=Decimal("0.00")))
            assert schema.hourly_rate == Decimal("0.00")

        def test_negative_rate_fails(self):
            with pytest.raises(ValidationError) as exc:
                WorkerProfileBase(**create_payload(hourly_rate=Decimal("-1.00")))
            assert "hourly_rate" in str(exc.value)

        def test_integer_rate_coerced_to_decimal(self):
            schema = WorkerProfileBase(**create_payload(hourly_rate=50))
            assert schema.hourly_rate == Decimal("50")

    # ── Field: avatar_url ────────────────────────────────────────────────────

    class TestAvatarUrlField:

        def test_valid_url_passes(self):
            schema = WorkerProfileBase(**create_payload(avatar_url="https://example.com/avatar.jpg"))
            assert schema.avatar_url is not None

        def test_invalid_url_fails(self):
            with pytest.raises(ValidationError) as exc:
                WorkerProfileBase(**create_payload(avatar_url="not-a-url"))
            assert "avatar_url" in str(exc.value)

        def test_none_passes(self):
            schema = WorkerProfileBase(**create_payload(avatar_url=None))
            assert schema.avatar_url is None

    # ── Security ─────────────────────────────────────────────────────────────

    class TestSecurityConstraints:

        def test_user_id_not_accepted(self):
            """user_id must come from JWT — not be settable by client."""
            with pytest.raises(ValidationError):
                WorkerProfileBase(**create_payload(user_id=99))

        def test_is_verified_not_accepted(self):
            """is_verified is admin-only — workers cannot set it."""
            with pytest.raises(ValidationError):
                WorkerProfileBase(**create_payload(is_verified=True))

        def test_extra_fields_forbidden(self):
            with pytest.raises(ValidationError):
                WorkerProfileBase(**create_payload(malicious_field="hacked"))


# ===========================================================================
# WorkerProfileUpdate
# ===========================================================================

class TestWorkerProfileUpdate:
    """
    WorkerProfileUpdate uses PATCH semantics — all fields are optional.
    Only send what needs to change.
    """

    class TestValidPayloads:

        def test_empty_payload_passes(self):
            """PATCH with no fields is valid — nothing changes."""
            schema = WorkerProfileUpdate()
            assert schema.bio is None

        def test_partial_update_passes(self):
            schema = WorkerProfileUpdate(**update_payload(bio="Updated bio"))
            assert schema.bio == "Updated bio"
            assert schema.hourly_rate is None  # untouched

        def test_full_update_passes(self):
            schema = WorkerProfileUpdate(**create_payload())
            assert schema.bio is not None

    class TestSecurityConstraints:

        def test_is_verified_not_accepted(self):
            with pytest.raises(ValidationError):
                WorkerProfileUpdate(**update_payload(is_verified=True))

        def test_user_id_not_accepted(self):
            with pytest.raises(ValidationError):
                WorkerProfileUpdate(**update_payload(user_id=99))

        def test_extra_fields_forbidden(self):
            with pytest.raises(ValidationError):
                WorkerProfileUpdate(**update_payload(malicious_field="hacked"))


# ===========================================================================
# WorkerProfileRead
# ===========================================================================

class TestWorkerProfileRead:
    """
    WorkerProfileRead is returned to clients.
    Includes read-only fields: id, user_id, is_verified.
    Must support ORM mode (from_attributes=True).
    """

    class TestValidPayloads:

        def test_full_read_payload_passes(self):
            schema = WorkerProfileRead(**read_payload())
            assert schema.id == 1
            assert schema.user_id == 42
            assert schema.is_verified is False

        def test_is_verified_true_passes(self):
            schema = WorkerProfileRead(**read_payload(is_verified=True))
            assert schema.is_verified is True

    class TestOrmMode:

        def test_from_orm_object_passes(self):
            """Simulate SQLAlchemy returning an ORM object instead of a dict."""

            class FakeORMProfile:
                id = 1
                user_id = 42
                bio = "Experienced plumber"
                years_of_experience = 10
                hourly_rate = Decimal("75.00")
                service_radius_km = 20
                avatar_url = "https://example.com/avatar.jpg"
                is_available = True
                is_verified = False

            schema = WorkerProfileRead.model_validate(FakeORMProfile())
            assert schema.id == 1
            assert schema.bio == "Experienced plumber"

    class TestMissingReadOnlyFields:

        def test_missing_id_fails(self):
            payload = read_payload()
            del payload["id"]
            with pytest.raises(ValidationError) as exc:
                WorkerProfileRead(**payload)
            assert "id" in str(exc.value)

        def test_missing_user_id_fails(self):
            payload = read_payload()
            del payload["user_id"]
            with pytest.raises(ValidationError) as exc:
                WorkerProfileRead(**payload)
            assert "user_id" in str(exc.value)

    class TestNestedStructure:
        def test_nested_user_structure(self):
            payload = nested_payload()
            schema = WorkerProfileNestedRead(**payload)

            assert schema.user is not None
            assert schema.user.id is not None
            assert schema.user.role_type is payload["user"]["role_type"]
            assert schema.user.uuid == payload["user"]["uuid"]
            assert schema.portfolio_images is not None
            assert len(schema.portfolio_images) == PORTFOLIO_IMAGES_COUNT



# ===========================================================================
# WorkerProfileDelete
# ===========================================================================
class TestWorkerProfileDelete:
    def test_valid_payload(self):
        schema = WorkerProfileDelete(**delete_payload())
        assert schema.id == 1

    def test_missing_id_fails(self):
        payload = delete_payload()
        del payload["id"]
        with pytest.raises(ValidationError) as exc:
            WorkerProfileDelete(**payload)
        assert "id" in str(exc.value)

    def test_extra_fields_fails(self):
        payload = delete_payload(extra_field="extra_value")
        with pytest.raises(ValidationError) as exc:
            WorkerProfileDelete(**payload)
        assert "extra_field" in str(exc.value)
