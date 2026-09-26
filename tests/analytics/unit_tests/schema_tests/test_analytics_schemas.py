from datetime import date

import pytest
from pydantic import ValidationError

from src.app.schemas.analytics import (
    AnalyticsDateRangeFilter,
    ConversionFunnelRead,
    DailyMetricPoint,
    LocationBreakdownItem,
    PlatformBreakdownRead,
    PlatformOverviewRead,
    TradeCategoryBreakdownItem,
)


class TestAnalyticsDateRangeFilter:
    def test_both_bounds_optional(self):
        schema = AnalyticsDateRangeFilter()
        assert schema.date_from is None
        assert schema.date_to is None

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            AnalyticsDateRangeFilter(unexpected="value")  # type: ignore[call-arg]


class TestPlatformOverviewRead:
    def test_valid(self):
        schema = PlatformOverviewRead(
            jobs_posted=10, applications_submitted=20, applications_accepted=5, jobs_completed=3,
            acceptance_rate=0.25, completion_rate=0.3, daily=[],
        )
        assert schema.jobs_posted == 10
        assert schema.daily == []

    def test_daily_points(self):
        schema = PlatformOverviewRead(
            jobs_posted=1, applications_submitted=0, applications_accepted=0, jobs_completed=0,
            acceptance_rate=0.0, completion_rate=0.0,
            daily=[DailyMetricPoint(date=date(2026, 1, 1), jobs_posted=1, applications_submitted=0, jobs_completed=0)],
        )
        assert len(schema.daily) == 1
        assert schema.daily[0].date == date(2026, 1, 1)


class TestPlatformBreakdownRead:
    def test_valid(self):
        schema = PlatformBreakdownRead(
            by_trade_category=[
                TradeCategoryBreakdownItem(trade_category_id=1, display_name="Plumbing", display_name_ar=None, display_name_fr=None, job_count=5)
            ],
            by_location=[LocationBreakdownItem(location="Algiers", job_count=5)],
        )
        assert schema.by_trade_category[0].job_count == 5
        assert schema.by_location[0].location == "Algiers"

    def test_trade_category_id_can_be_none(self):
        item = TradeCategoryBreakdownItem(trade_category_id=None, display_name=None, display_name_ar=None, display_name_fr=None, job_count=2)
        assert item.trade_category_id is None
        assert item.display_name is None


class TestConversionFunnelRead:
    def test_valid(self):
        schema = ConversionFunnelRead(posted=10, applied=8, accepted=5, completed=3)
        assert schema.posted == 10
        assert schema.completed == 3

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            ConversionFunnelRead(posted=1, applied=1, accepted=1, completed=1, unexpected="value")  # type: ignore[call-arg]
