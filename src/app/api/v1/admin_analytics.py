from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import get_current_superuser
from ...core.db.database import async_get_db
from ...schemas.analytics import AnalyticsDateRangeFilter, ConversionFunnelRead, PlatformBreakdownRead, PlatformOverviewRead
from ...services.analytics_service import get_conversion_funnel, get_platform_breakdown, get_platform_overview

router = APIRouter(tags=["admin"], prefix="/admin/analytics", dependencies=[Depends(get_current_superuser)])


# ─── GET /admin/analytics/overview ───────────────────────────────────────────
@router.get("/overview", response_model=PlatformOverviewRead, status_code=200)
async def get_overview(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        filters: Annotated[AnalyticsDateRangeFilter, Depends()],
) -> PlatformOverviewRead:
    """Headline counts/rates plus a 30-day daily time series."""
    return await get_platform_overview(db, filters)


# ─── GET /admin/analytics/breakdown ───────────────────────────────────────────
@router.get("/breakdown", response_model=PlatformBreakdownRead, status_code=200)
async def get_breakdown(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        filters: Annotated[AnalyticsDateRangeFilter, Depends()],
) -> PlatformBreakdownRead:
    """Top trade categories and locations by job count."""
    return await get_platform_breakdown(db, filters)


# ─── GET /admin/analytics/funnel ──────────────────────────────────────────────
@router.get("/funnel", response_model=ConversionFunnelRead, status_code=200)
async def get_funnel(
        db: Annotated[AsyncSession, Depends(async_get_db)],
        filters: Annotated[AnalyticsDateRangeFilter, Depends()],
) -> ConversionFunnelRead:
    """Posted -> applied -> accepted -> completed, for jobs posted in the range."""
    return await get_conversion_funnel(db, filters)
