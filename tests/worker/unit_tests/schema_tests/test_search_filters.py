from decimal import Decimal

import pytest
from pydantic import ValidationError

from src.app.schemas.worker_profile import WorkerProfileFilter


class TestWorkerProfileFilter:
    def test_empty_filter_is_valid(self):
        filter_ = WorkerProfileFilter()

        assert filter_.trade_category_id is None
        assert filter_.min_hourly_rate is None
        assert filter_.max_hourly_rate is None
        assert filter_.is_available is None
        assert filter_.is_verified is None
        assert filter_.is_geo_search is False

    def test_valid_filter(self):
        filter_ = WorkerProfileFilter(
            trade_category_id=5,
            min_hourly_rate=Decimal("20.00"),
            max_hourly_rate=Decimal("40.00"),
            min_years_of_experience=2,
            max_years_of_experience=10,
            service_radius_km=25,
            is_available=True,
            is_verified=True,
            latitude=40.7128,
            longitude=-74.0060,
            radius_km=50,
        )

        assert filter_.trade_category_id == 5
        assert filter_.min_hourly_rate == Decimal("20.00")
        assert filter_.max_hourly_rate == Decimal("40.00")
        assert filter_.min_years_of_experience == 2
        assert filter_.max_years_of_experience == 10
        assert filter_.service_radius_km == 25
        assert filter_.is_available is True
        assert filter_.is_verified is True
        assert filter_.latitude == 40.7128
        assert filter_.longitude == -74.0060
        assert filter_.radius_km == 50
        assert filter_.is_geo_search is True

    # ------------------------------------------------------------------
    # Hourly rate
    # ------------------------------------------------------------------

    def test_min_hourly_rate_cannot_be_negative(self):
        with pytest.raises(ValidationError):
            WorkerProfileFilter(min_hourly_rate=Decimal("-1"))

    def test_max_hourly_rate_cannot_be_negative(self):
        with pytest.raises(ValidationError):
            WorkerProfileFilter(max_hourly_rate=Decimal("-1"))

    def test_hourly_rate_range_allows_equal_values(self):
        filter_ = WorkerProfileFilter(
            min_hourly_rate=Decimal("25"),
            max_hourly_rate=Decimal("25"),
        )

        assert filter_.min_hourly_rate == Decimal("25")
        assert filter_.max_hourly_rate == Decimal("25")

    def test_hourly_rate_range_rejects_max_less_than_min(self):
        with pytest.raises(
                ValidationError,
                match="max_hourly_rate must be greater than or equal to min_hourly_rate",
        ):
            WorkerProfileFilter(
                min_hourly_rate=Decimal("40"),
                max_hourly_rate=Decimal("20"),
            )

    def test_hourly_rate_range_allows_only_min(self):
        filter_ = WorkerProfileFilter(
            min_hourly_rate=Decimal("20"),
        )

        assert filter_.min_hourly_rate == Decimal("20")

    def test_hourly_rate_range_allows_only_max(self):
        filter_ = WorkerProfileFilter(
            max_hourly_rate=Decimal("40"),
        )

        assert filter_.max_hourly_rate == Decimal("40")

    # ------------------------------------------------------------------
    # Experience
    # ------------------------------------------------------------------

    def test_min_years_of_experience_cannot_be_negative(self):
        with pytest.raises(ValidationError):
            WorkerProfileFilter(min_years_of_experience=-1)

    def test_max_years_of_experience_cannot_be_negative(self):
        with pytest.raises(ValidationError):
            WorkerProfileFilter(max_years_of_experience=-1)

    def test_experience_cannot_exceed_100(self):
        with pytest.raises(ValidationError):
            WorkerProfileFilter(min_years_of_experience=101)

        with pytest.raises(ValidationError):
            WorkerProfileFilter(max_years_of_experience=101)

    def test_experience_range_allows_equal_values(self):
        filter_ = WorkerProfileFilter(
            min_years_of_experience=5,
            max_years_of_experience=5,
        )

        assert filter_.min_years_of_experience == 5
        assert filter_.max_years_of_experience == 5

    def test_experience_range_rejects_max_less_than_min(self):
        with pytest.raises(
                ValidationError,
                match="max_years_of_experience must be greater than or equal to min_years_of_experience",
        ):
            WorkerProfileFilter(
                min_years_of_experience=10,
                max_years_of_experience=5,
            )

    # ------------------------------------------------------------------
    # Service radius
    # ------------------------------------------------------------------

    def test_service_radius_km_cannot_be_negative(self):
        with pytest.raises(ValidationError):
            WorkerProfileFilter(service_radius_km=-1)

    def test_service_radius_km_allows_zero(self):
        filter_ = WorkerProfileFilter(service_radius_km=0)

        assert filter_.service_radius_km == 0

    # ------------------------------------------------------------------
    # Geo coordinates
    # ------------------------------------------------------------------

    def test_latitude_must_be_between_minus_90_and_90(self):
        with pytest.raises(ValidationError):
            WorkerProfileFilter(latitude=91, longitude=0)

        with pytest.raises(ValidationError):
            WorkerProfileFilter(latitude=-91, longitude=0)

    def test_longitude_must_be_between_minus_180_and_180(self):
        with pytest.raises(ValidationError):
            WorkerProfileFilter(latitude=0, longitude=181)

        with pytest.raises(ValidationError):
            WorkerProfileFilter(latitude=0, longitude=-181)

    def test_valid_geo_coordinates(self):
        filter_ = WorkerProfileFilter(
            latitude=40.7128,
            longitude=-74.0060,
        )

        assert filter_.is_geo_search is True

    def test_latitude_without_longitude_is_invalid(self):
        with pytest.raises(
                ValidationError,
                match="Both latitude and longitude must be provided together",
        ):
            WorkerProfileFilter(latitude=40.7128)

    def test_longitude_without_latitude_is_invalid(self):
        with pytest.raises(
                ValidationError,
                match="Both latitude and longitude must be provided together",
        ):
            WorkerProfileFilter(longitude=-74.0060)

    def test_no_coordinates_means_not_geo_search(self):
        filter_ = WorkerProfileFilter()

        assert filter_.is_geo_search is False

    def test_both_coordinates_mean_geo_search(self):
        filter_ = WorkerProfileFilter(
            latitude=40.0,
            longitude=-74.0,
        )

        assert filter_.is_geo_search is True

    # ------------------------------------------------------------------
    # Geo radius
    # ------------------------------------------------------------------

    def test_radius_km_must_be_at_least_one(self):
        with pytest.raises(ValidationError):
            WorkerProfileFilter(radius_km=0)

    def test_radius_km_cannot_exceed_200(self):
        with pytest.raises(ValidationError):
            WorkerProfileFilter(radius_km=201)

    def test_radius_km_allows_1_and_200(self):
        filter_ = WorkerProfileFilter(radius_km=1)
        assert filter_.radius_km == 1

        filter_ = WorkerProfileFilter(radius_km=200)
        assert filter_.radius_km == 200
