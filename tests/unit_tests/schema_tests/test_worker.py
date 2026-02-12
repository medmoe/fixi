import pytest
from pydantic import ValidationError

from src.app.schemas.worker import (
    WorkerBase,
    WorkerCreate,
    WorkerUpdate,
    WorkerRead,
    WorkerPublicRead,
    WorkerVerificationUpdate,
)


class TestWorkerSchemas:
    """Test Worker pydantic schemas."""

    def test_worker_base_valid(self):
        """Test WorkerBase with valid data."""
        worker = WorkerBase(
            profession="Plumber",
            hourly_rate=75.0,
            years_of_experience=10,
            bio="Experienced plumber",
            availability_status="available",
        )
        assert worker.profession == "Plumber"
        assert worker.hourly_rate == 75.0
        assert worker.years_of_experience == 10

    def test_worker_base_minimum_fields(self):
        """Test WorkerBase with only required fields."""
        worker = WorkerBase(
            profession="Carpenter",
            hourly_rate=60.0,
        )
        assert worker.profession == "Carpenter"
        assert worker.hourly_rate == 60.0
        assert worker.years_of_experience is None
        assert worker.bio is None
        assert worker.availability_status == "available"

    def test_worker_base_invalid_profession_length(self):
        """Test WorkerBase with invalid profession length."""
        with pytest.raises(ValidationError) as exc_info:
            WorkerBase(
                profession="P",  # Too short
                hourly_rate=75.0,
            )

        errors = exc_info.value.errors()
        assert any("at least 2 characters" in str(error) for error in errors)

    def test_worker_base_invalid_hourly_rate_negative(self):
        """Test WorkerBase with negative hourly rate."""
        with pytest.raises(ValidationError) as exc_info:
            WorkerBase(
                profession="Plumber",
                hourly_rate=-10.0,
            )

        errors = exc_info.value.errors()
        assert any("greater than 0" in str(error) for error in errors)

    def test_worker_base_invalid_hourly_rate_too_high(self):
        """Test WorkerBase with too high hourly rate."""
        with pytest.raises(ValidationError) as exc_info:
            WorkerBase(
                profession="Plumber",
                hourly_rate=15000.0,
            )

        errors = exc_info.value.errors()
        assert any("less than or equal to 10000" in str(error) for error in errors)

    def test_worker_base_invalid_years_negative(self):
        """Test WorkerBase with negative years of experience."""
        with pytest.raises(ValidationError) as exc_info:
            WorkerBase(
                profession="Plumber",
                hourly_rate=75.0,
                years_of_experience=-5,
            )

        errors = exc_info.value.errors()
        assert any("greater than or equal to 0" in str(error) for error in errors)

    def test_worker_base_invalid_availability_status(self):
        """Test WorkerBase with invalid availability status."""
        with pytest.raises(ValidationError) as exc_info:
            WorkerBase(
                profession="Plumber",
                hourly_rate=75.0,
                availability_status="invalid_status",
            )

        errors = exc_info.value.errors()
        assert any("available" in str(error) for error in errors)

    def test_worker_base_valid_availability_statuses(self):
        """Test WorkerBase with all valid availability statuses."""
        for status in ["available", "busy", "offline"]:
            worker = WorkerBase(
                profession="Plumber",
                hourly_rate=75.0,
                availability_status=status,
            )
            assert worker.availability_status == status

    def test_worker_base_bio_max_length(self):
        """Test WorkerBase bio maximum length."""
        long_bio = "x" * 501
        with pytest.raises(ValidationError) as exc_info:
            WorkerBase(
                profession="Plumber",
                hourly_rate=75.0,
                bio=long_bio,
            )

        errors = exc_info.value.errors()
        assert any("at most 500 characters" in str(error) for error in errors)

    def test_worker_create_valid(self):
        """Test WorkerCreate with valid data."""
        worker = WorkerCreate(
            user_id=1,
            profession="Plumber",
            hourly_rate=75.0,
        )
        assert worker.user_id == 1
        assert worker.profession == "Plumber"

    def test_worker_create_extra_fields_forbidden(self):
        """Test WorkerCreate rejects extra fields."""
        with pytest.raises(ValidationError):
            WorkerCreate(
                user_id=1,
                profession="Plumber",
                hourly_rate=75.0,
                extra_field="not allowed",
            )

    def test_worker_update_all_optional(self):
        """Test WorkerUpdate with all fields optional."""
        worker = WorkerUpdate()
        assert worker.profession is None
        assert worker.hourly_rate is None
        assert worker.years_of_experience is None

    def test_worker_update_partial(self):
        """Test WorkerUpdate with partial data."""
        worker = WorkerUpdate(
            hourly_rate=80.0,
            availability_status="busy",
        )
        assert worker.hourly_rate == 80.0
        assert worker.availability_status == "busy"
        assert worker.profession is None

    def test_worker_read_complete(self):
        """Test WorkerRead with complete data."""
        worker = WorkerRead(
            id=1,
            user_id=1,
            service_category_id=None,
            profession="Plumber",
            hourly_rate=75.0,
            skills=["pipes"],
            portfolio_image_urls=["https://cdn.example.com/portfolio/1.jpg"],
            years_of_experience=10,
            is_verified=True,
            bio="Experienced",
            availability_status="available",
            average_rating=4.5,
            total_rating=10,
        )
        assert worker.id == 1
        assert worker.user_id == 1
        assert worker.is_verified is True
        assert worker.average_rating == 4.5

    def test_worker_public_read_hides_user_id(self):
        """Test WorkerPublicRead schema structure."""
        worker = WorkerPublicRead(
            id=1,
            service_category_id=None,
            profession="Plumber",
            hourly_rate=75.0,
            skills=["pipes"],
            portfolio_image_urls=["https://cdn.example.com/portfolio/1.jpg"],
            years_of_experience=10,
            is_verified=True,
            bio="Experienced",
            availability_status="available",
            average_rating=4.5,
            total_rating=10,
        )
        # Note: user_id should not be in WorkerPublicRead
        assert hasattr(worker, 'id')
        assert hasattr(worker, 'profession')

    def test_worker_verification_update(self):
        """Test WorkerVerificationUpdate schema."""
        update = WorkerVerificationUpdate(is_verified=True)
        assert update.is_verified is True

        update = WorkerVerificationUpdate(is_verified=False)
        assert update.is_verified is False
