from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class AnalyticsDateRangeFilter(BaseModel):
    """Shared query params for every /admin/analytics endpoint. Both are
    optional -- totals/breakdowns run all-time when omitted, but the daily
    time series in PlatformOverviewRead always defaults to the last 30 days
    to keep the point count (and the underlying GROUP BY) bounded -- see
    analytics_service.get_platform_overview."""

    model_config = ConfigDict(extra="forbid")

    date_from: datetime | None = None
    date_to: datetime | None = None


class DailyMetricPoint(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: date
    jobs_posted: int
    applications_submitted: int
    jobs_completed: int


class PlatformOverviewRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    jobs_posted: int
    applications_submitted: int
    applications_accepted: int
    jobs_completed: int
    acceptance_rate: float
    completion_rate: float
    daily: list[DailyMetricPoint]


class TradeCategoryBreakdownItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trade_category_id: int | None
    display_name: str | None
    display_name_ar: str | None
    display_name_fr: str | None
    job_count: int


class LocationBreakdownItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    location: str
    job_count: int


class PlatformBreakdownRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    by_trade_category: list[TradeCategoryBreakdownItem]
    by_location: list[LocationBreakdownItem]


class ConversionFunnelRead(BaseModel):
    """A job-level pipeline: how many jobs posted in the range reached each
    later stage. Each stage is a subset of the one before it (a completed
    job was necessarily accepted first, etc.) -- see
    analytics_service.get_conversion_funnel."""

    model_config = ConfigDict(extra="forbid")

    posted: int
    applied: int
    accepted: int
    completed: int
