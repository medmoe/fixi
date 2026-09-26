from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import ColumnElement, Date, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import ApplicationStatus, Job, JobApplication, JobStatus, TradeCategory
from ..schemas.analytics import (
    AnalyticsDateRangeFilter,
    ConversionFunnelRead,
    DailyMetricPoint,
    LocationBreakdownItem,
    PlatformBreakdownRead,
    PlatformOverviewRead,
    TradeCategoryBreakdownItem,
)

_BREAKDOWN_LIMIT = 20
_DEFAULT_DAILY_WINDOW_DAYS = 30


def _job_range_clauses(filters: AnalyticsDateRangeFilter) -> list[ColumnElement[bool]]:
    clauses: list[ColumnElement[bool]] = [Job.is_deleted.is_(False)]
    if filters.date_from is not None:
        clauses.append(Job.created_at >= filters.date_from)
    if filters.date_to is not None:
        clauses.append(Job.created_at <= filters.date_to)
    return clauses


def _application_range_clauses(filters: AnalyticsDateRangeFilter) -> list[ColumnElement[bool]]:
    clauses: list[ColumnElement[bool]] = []
    if filters.date_from is not None:
        clauses.append(JobApplication.created_at >= filters.date_from)
    if filters.date_to is not None:
        clauses.append(JobApplication.created_at <= filters.date_to)
    return clauses


async def get_platform_overview(db: AsyncSession, filters: AnalyticsDateRangeFilter) -> PlatformOverviewRead:
    """Headline counts/rates for the given range (all-time when both bounds
    are omitted), plus a daily time series. The time series always defaults
    to the last 30 days regardless of the filter's own range, so a single
    dashboard load never has to GROUP BY an unbounded number of days."""
    job_clauses = _job_range_clauses(filters)
    app_clauses = _application_range_clauses(filters)

    jobs_posted = await db.scalar(select(func.count(Job.id)).where(*job_clauses)) or 0
    jobs_completed = await db.scalar(
        select(func.count(Job.id)).where(*job_clauses, Job.status == JobStatus.COMPLETED)
    ) or 0
    applications_submitted = await db.scalar(select(func.count(JobApplication.id)).where(*app_clauses)) or 0
    applications_accepted = await db.scalar(
        select(func.count(JobApplication.id)).where(*app_clauses, JobApplication.status == ApplicationStatus.ACCEPTED)
    ) or 0

    acceptance_rate = round(applications_accepted / applications_submitted, 4) if applications_submitted else 0.0
    completion_rate = round(jobs_completed / jobs_posted, 4) if jobs_posted else 0.0

    daily = await _get_daily_breakdown(db)

    return PlatformOverviewRead(
        jobs_posted=jobs_posted,
        applications_submitted=applications_submitted,
        applications_accepted=applications_accepted,
        jobs_completed=jobs_completed,
        acceptance_rate=acceptance_rate,
        completion_rate=completion_rate,
        daily=daily,
    )


async def _get_daily_breakdown(db: AsyncSession, window_days: int = _DEFAULT_DAILY_WINDOW_DAYS) -> list[DailyMetricPoint]:
    window_start = datetime.now(UTC) - timedelta(days=window_days)

    posted_day = cast(Job.created_at, Date)
    posted_stmt = (
        select(posted_day.label("day"), func.count(Job.id))
        .where(Job.is_deleted.is_(False), Job.created_at >= window_start)
        .group_by(posted_day)
    )
    completed_stmt = (
        select(posted_day.label("day"), func.count(Job.id))
        .where(Job.is_deleted.is_(False), Job.created_at >= window_start, Job.status == JobStatus.COMPLETED)
        .group_by(posted_day)
    )
    applied_day = cast(JobApplication.created_at, Date)
    applied_stmt = (
        select(applied_day.label("day"), func.count(JobApplication.id))
        .where(JobApplication.created_at >= window_start)
        .group_by(applied_day)
    )

    posted_by_day: dict[Any, int] = dict((await db.execute(posted_stmt)).tuples().all())
    completed_by_day: dict[Any, int] = dict((await db.execute(completed_stmt)).tuples().all())
    applied_by_day: dict[Any, int] = dict((await db.execute(applied_stmt)).tuples().all())

    all_days = sorted(set(posted_by_day) | set(completed_by_day) | set(applied_by_day))
    return [
        DailyMetricPoint(
            date=day,
            jobs_posted=posted_by_day.get(day, 0),
            applications_submitted=applied_by_day.get(day, 0),
            jobs_completed=completed_by_day.get(day, 0),
        )
        for day in all_days
    ]


async def get_platform_breakdown(db: AsyncSession, filters: AnalyticsDateRangeFilter) -> PlatformBreakdownRead:
    """Top trade categories and locations by job count -- capped at
    _BREAKDOWN_LIMIT, matching the issue's "simple dashboard, not a full BI
    tool" scope rather than paginating an exhaustive list."""
    job_clauses = _job_range_clauses(filters)

    trade_stmt = (
        select(
            TradeCategory.id, TradeCategory.display_name, TradeCategory.display_name_ar, TradeCategory.display_name_fr,
            func.count(Job.id).label("job_count"),
        )
        .select_from(Job)
        .outerjoin(TradeCategory, TradeCategory.id == Job.trade_category_id)
        .where(*job_clauses)
        .group_by(TradeCategory.id, TradeCategory.display_name, TradeCategory.display_name_ar, TradeCategory.display_name_fr)
        .order_by(func.count(Job.id).desc())
        .limit(_BREAKDOWN_LIMIT)
    )
    trade_result = await db.execute(trade_stmt)
    by_trade_category = [
        TradeCategoryBreakdownItem(
            trade_category_id=row.id, display_name=row.display_name,
            display_name_ar=row.display_name_ar, display_name_fr=row.display_name_fr,
            job_count=row.job_count,
        )
        for row in trade_result.all()
    ]

    location_stmt = (
        select(Job.display_location, func.count(Job.id).label("job_count"))
        .where(*job_clauses, Job.display_location.is_not(None))
        .group_by(Job.display_location)
        .order_by(func.count(Job.id).desc())
        .limit(_BREAKDOWN_LIMIT)
    )
    location_result = await db.execute(location_stmt)
    by_location = [
        LocationBreakdownItem(location=row.display_location, job_count=row.job_count)
        for row in location_result.all()
    ]

    return PlatformBreakdownRead(by_trade_category=by_trade_category, by_location=by_location)


async def get_conversion_funnel(db: AsyncSession, filters: AnalyticsDateRangeFilter) -> ConversionFunnelRead:
    """Job-level funnel over the jobs posted in the given range: how many
    went on to receive an application, get accepted (reach at least
    ASSIGNED), and complete. Each stage is a strict subset of the one
    before -- a job can't be ASSIGNED without an application existing."""
    job_clauses = _job_range_clauses(filters)

    posted = await db.scalar(select(func.count(Job.id)).where(*job_clauses)) or 0

    applied = await db.scalar(
        select(func.count(func.distinct(Job.id)))
        .select_from(Job)
        .join(JobApplication, JobApplication.job_id == Job.id)
        .where(*job_clauses)
    ) or 0

    accepted = await db.scalar(
        select(func.count(Job.id)).where(
            *job_clauses, Job.status.in_((JobStatus.ASSIGNED, JobStatus.IN_PROGRESS, JobStatus.COMPLETED)),
        )
    ) or 0

    completed = await db.scalar(
        select(func.count(Job.id)).where(*job_clauses, Job.status == JobStatus.COMPLETED)
    ) or 0

    return ConversionFunnelRead(posted=posted, applied=applied, accepted=accepted, completed=completed)
