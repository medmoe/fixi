"""
Unit tests for Job Pydantic schemas.

Covers: valid construction, invalid values, edge cases, enum serialization,
budget constraints, extra fields rejection, and nested model behavior.
"""
from datetime import datetime, UTC
from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError

from src.app.models import JobStatus
from src.app.schemas.job import (
    JobBase,
    JobCreateInternal,
    JobCreate,
    JobDelete,
    JobFilter,
    JobRead,
    JobUpdate,
    JobUpdateInternal,
    TradeCategoryRead,
    PaginationParams
)


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers / Fixtures
# ═══════════════════════════════════════════════════════════════════════════════

def _valid_job_base_kwargs(**overrides) -> dict:
    return {
        "title": "Fix leaky faucet",
        "description": "Kitchen sink is dripping",
        "trade_category_id": 1,
        "budget_min": Decimal("100.00"),
        "budget_max": Decimal("500.00"),
        "display_location": "123 Main St, NY",
        **overrides,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# JobBase
# ═══════════════════════════════════════════════════════════════════════════════

class TestJobBase:
    """Tests for the shared JobBase schema."""

    def test_valid_construction(self):
        job = JobBase(**_valid_job_base_kwargs())
        assert job.title == "Fix leaky faucet"

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError) as exc_info:
            JobBase(**_valid_job_base_kwargs(extra_field="bad"))
        assert "extra_field" in str(exc_info.value)

    def test_title_required(self):
        with pytest.raises(ValidationError):
            JobBase(**_valid_job_base_kwargs(title=None))

    def test_title_empty_string_fails(self):
        with pytest.raises(ValidationError):
            JobBase(**_valid_job_base_kwargs(title=""))

    def test_title_too_long_fails(self):
        with pytest.raises(ValidationError):
            JobBase(**_valid_job_base_kwargs(title="x" * 256))

    def test_description_optional(self):
        job = JobBase(**_valid_job_base_kwargs(description=None))
        assert job.description is None

    def test_trade_category_id_optional(self):
        job = JobBase(**_valid_job_base_kwargs(trade_category_id=None))
        assert job.trade_category_id is None

    def test_budget_min_negative_fails(self):
        with pytest.raises(ValidationError):
            JobBase(**_valid_job_base_kwargs(budget_min=Decimal("-10.00")))

    def test_budget_max_negative_fails(self):
        with pytest.raises(ValidationError):
            JobBase(**_valid_job_base_kwargs(budget_max=Decimal("-10.00")))

    def test_budget_more_than_two_decimal_places_fails(self):
        with pytest.raises(ValidationError):
            JobBase(**_valid_job_base_kwargs(budget_min=Decimal("100.123")))


# ═══════════════════════════════════════════════════════════════════════════════
# JobCreate
# ═══════════════════════════════════════════════════════════════════════════════

class TestJobCreate:
    """Tests for the client-facing JobCreate schema."""

    def test_valid_construction(self):
        job = JobCreate(**_valid_job_base_kwargs(latitude=47.01, longitude=-122.01))
        assert job.latitude == 47.01
        assert job.longitude == -122.01

    def test_latitude_longitude_are_not_optional(self):
        with pytest.raises(ValidationError):
            job = JobCreate(**_valid_job_base_kwargs())

    def test_latitude_longitude_must_be_given_together(self):
        with pytest.raises(ValidationError):
            JobCreate(**_valid_job_base_kwargs(latitude=47.01))
        with pytest.raises(ValidationError):
            JobCreate(**_valid_job_base_kwargs(longitude=-122.01))

    def test_inherits_job_base_validation(self):
        with pytest.raises(ValidationError):
            JobCreate(**_valid_job_base_kwargs(title=""))


# ═══════════════════════════════════════════════════════════════════════════════
# JobCreateInternal
# ═══════════════════════════════════════════════════════════════════════════════

class TestJobCreateInternal:
    """Tests for JobCreateInternal schema."""

    def test_valid_construction(self):
        req = JobCreateInternal(
            title="Fix leaky faucet",
            description="Kitchen sink",
            trade_category_id=1,
            user_id=42,
            budget_min=Decimal("100.00"),
            budget_max=Decimal("500.00"),
            display_location="123 Main St",
        )
        assert req.title == "Fix leaky faucet"

    def test_no_latitude_longitude_fields(self):
        req = JobCreateInternal(title="Test", user_id=42)
        assert req.location is None

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            JobCreateInternal(title="Test", injected_field="bad")

    def test_all_fields_optional_except_title_and_user_id(self):
        req = JobCreateInternal(title="Minimal job", user_id=42)
        assert req.description is None
        assert req.trade_category_id is None
        assert req.budget_min is None
        assert req.budget_max is None
        assert req.display_location is None
        assert req.location is None


# ═══════════════════════════════════════════════════════════════════════════════
# JobUpdate
# ═══════════════════════════════════════════════════════════════════════════════

class TestJobUpdate:
    """Tests for the partial-update JobUpdate schema."""

    def test_all_fields_optional(self):
        job_update = JobUpdate()
        assert job_update.title is None
        assert job_update.status is None

    def test_partial_update_valid(self):
        job_update = JobUpdate(title="New title", status=JobStatus.IN_PROGRESS)
        assert job_update.title == "New title"
        assert job_update.status == JobStatus.IN_PROGRESS

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            JobUpdate(malicious_field=True)

    def test_invalid_status_rejected(self):
        with pytest.raises(ValidationError):
            JobUpdate(status="not_a_status")

    def test_budget_min_negative_rejected(self):
        with pytest.raises(ValidationError):
            JobUpdate(budget_min=Decimal("-1.00"))

    def test_latitude_longitude_accepted(self):
        job_update = JobUpdate(latitude=0.0, longitude=0.0)
        assert job_update.latitude == 0.0
        assert job_update.longitude == 0.0

    def test_latitude_longitude_must_be_given_both(self):
        with pytest.raises(ValidationError):
            JobUpdate(latitude=0.0)
        with pytest.raises(ValidationError):
            JobUpdate(longitude=0.0)


class TestJobUpdateInternal:
    """Tests for the internal JobUpdateInternal schema."""

    def test_includes_user_id(self):
        update = JobUpdateInternal(user_id=99)
        assert update.user_id == 99

    def test_user_id_required(self):
        with pytest.raises(ValidationError):
            update = JobUpdateInternal()

    def test_user_id_must_be_positive(self):
        with pytest.raises(ValidationError):
            update = JobUpdateInternal(user_id=-1)

    def test_inherits_job_update_validation(self):
        with pytest.raises(ValidationError):
            JobUpdateInternal(title="", budget_min=Decimal("-5.00"))

# ═══════════════════════════════════════════════════════════════════════════════
# TradeCategoryRead
# ═══════════════════════════════════════════════════════════════════════════════

class TestTradeCategoryRead:
    """Tests for the nested TradeCategoryRead schema."""

    def test_valid_construction(self):
        tc = TradeCategoryRead(id=1, name="plumbing", display_name="Plumbing")
        assert tc.id == 1
        assert tc.name == "plumbing"
        assert tc.display_name == "Plumbing"

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            TradeCategoryRead(id=1, name="plumbing", extra="bad", display_name="Plumbing")

    def test_from_attributes(self):
        """Simulate ORM object conversion."""

        class FakeORM:
            id = 7
            name = "Electrical"
            display_name = "Electrical"

        tc = TradeCategoryRead.model_validate(FakeORM())
        assert tc.id == 7
        assert tc.name == "Electrical"
        assert tc.display_name == "Electrical"


# ═══════════════════════════════════════════════════════════════════════════════
# JobRead
# ═══════════════════════════════════════════════════════════════════════════════

class TestJobRead:
    """Tests for the full response JobRead schema."""

    def _valid_read_kwargs(self, **overrides) -> dict:
        return {
            "id": 1,
            "uuid": uuid4(),
            "title": "Fix sink",
            "description": None,
            "trade_category_id": None,
            "user_id": 42,
            "budget_min": None,
            "budget_max": None,
            "display_location": None,
            "location": None,
            "status": JobStatus.OPEN,
            "created_at": datetime.now(UTC),
            "updated_at": None,
            "deleted_at": None,
            "is_deleted": False,
            "trade_category": None,
            **overrides,
        }

    def test_valid_construction(self):
        job = JobRead(**self._valid_read_kwargs())
        assert job.id == 1

    def test_status_serialized_as_string(self):
        """use_enum_values=True must serialize enum to its .value string."""
        job = JobRead(**self._valid_read_kwargs(status=JobStatus.COMPLETED))
        assert job.status == "completed"
        assert isinstance(job.status, str)

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            JobRead(**self._valid_read_kwargs(injected="bad"))

    def test_nested_trade_category(self):
        job = JobRead(
            **self._valid_read_kwargs(
                trade_category=TradeCategoryRead(id=3, name="HVAC", display_name="HVAC")
            )
        )
        assert job.trade_category is not None
        assert job.trade_category.name == "HVAC"
        assert job.trade_category.display_name == "HVAC"

    def test_from_attributes_with_orm(self):
        """Simulate ORM object conversion."""

        class FakeTradeCategory:
            id = 5
            name = "Carpentry"
            display_name = "Carpentry"

        class FakeJob:
            id = 1
            uuid = uuid4()
            title = "Build shelf"
            description = None
            trade_category_id = 5
            user_id = 10
            budget_min = Decimal("50.00")
            budget_max = Decimal("150.00")
            display_location = "456 Oak Ave"
            location = None
            status = JobStatus.OPEN
            created_at = datetime.now(UTC)
            updated_at = None
            deleted_at = None
            is_deleted = False
            trade_category = FakeTradeCategory()

        job = JobRead.model_validate(FakeJob())
        assert job.title == "Build shelf"
        assert job.trade_category.name == "Carpentry"
        assert job.trade_category.display_name == "Carpentry"
        assert job.status == "open"  # enum value, not the enum member

    def test_missing_required_field_fails(self):
        with pytest.raises(ValidationError):
            JobRead(**self._valid_read_kwargs(title=None))


# ═══════════════════════════════════════════════════════════════════════════════
# JobDelete
# ═══════════════════════════════════════════════════════════════════════════════

class TestJobDelete:
    """Tests for the soft-delete response schema."""

    def test_valid_construction(self):
        deleted = JobDelete(
            id=1,
            uuid=uuid4(),
            title="Old job",
            is_deleted=True,
            deleted_at=datetime.now(UTC),
        )
        assert deleted.is_deleted is True
        assert deleted.deleted_at is not None

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            JobDelete(id=1, uuid=uuid4(), title="x", is_deleted=True, deleted_at=None, extra="bad")

    def test_from_attributes(self):
        class FakeJob:
            id = 2
            uuid = uuid4()
            title = "Gone"
            is_deleted = True
            deleted_at = datetime.now(UTC)

        deleted = JobDelete.model_validate(FakeJob())
        assert deleted.is_deleted is True


# ═══════════════════════════════════════════════════════════════════════════════
# JobFilter
# ═══════════════════════════════════════════════════════════════════════════════

class TestJobFilter:
    """Tests for the query filter schema."""

    def test_empty_filter_valid(self):
        f = JobFilter()
        assert f.status is None

    def test_all_fields_set(self):
        f = JobFilter(
            status=JobStatus.OPEN,
            trade_category_id=1,
            user_id=42,
            budget_min=Decimal("100.00"),
            budget_max=Decimal("500.00"),
            search="plumber",
            is_deleted=False,
        )
        assert f.status == JobStatus.OPEN

    def test_offset_negative_fails(self):
        with pytest.raises(ValidationError):
            PaginationParams(offset=-1)

    def test_limit_zero_fails(self):
        with pytest.raises(ValidationError):
            PaginationParams(limit=0)

    def test_limit_over_100_fails(self):
        with pytest.raises(ValidationError):
            PaginationParams(limit=101)

    def test_budget_min_negative_fails(self):
        with pytest.raises(ValidationError):
            JobFilter(budget_min=Decimal("-1.00"))

    def test_search_too_long_fails(self):
        with pytest.raises(ValidationError):
            JobFilter(search="x" * 256)
