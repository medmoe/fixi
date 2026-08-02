"""
Job Pydantic schemas for CRUD operations and API serialization.
"""
from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .trade_category import TradeCategoryRead
from ..models import JobStatus


# ═══════════════════════════════════════════════════════════════════════════════
# Base
# ═══════════════════════════════════════════════════════════════════════════════

class JobBase(BaseModel):
    """Shared fields for Job schemas."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None)
    trade_category_id: int | None = Field(default=None)
    budget_min: Decimal | None = Field(default=None, ge=Decimal("0.00"), decimal_places=2)
    budget_max: Decimal | None = Field(default=None, ge=Decimal("0.00"), decimal_places=2)
    display_location: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, examples=["POINT(-73.985703 40.748441)"])  # PostGIS point
    status: JobStatus = Field(default=JobStatus.OPEN)


# ═══════════════════════════════════════════════════════════════════════════════
# Create
# ═══════════════════════════════════════════════════════════════════════════════

class JobCreate(JobBase):
    """Schema for creating a new Job (service layer)."""
    user_id: int


class JobCreateRequest(BaseModel):
    """Client-facing schema for creating a Job.

    No user_id — set from JWT token in the API layer.
    """

    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None)
    trade_category_id: int | None = Field(default=None)
    budget_min: Decimal | None = Field(default=None, ge=Decimal("0.00"), decimal_places=2)
    budget_max: Decimal | None = Field(default=None, ge=Decimal("0.00"), decimal_places=2)
    display_location: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None)


# ═══════════════════════════════════════════════════════════════════════════════
# Update
# ═══════════════════════════════════════════════════════════════════════════════

class JobUpdate(BaseModel):
    """Schema for updating a Job (partial update, all fields optional)."""

    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None)
    trade_category_id: int | None = Field(default=None)
    budget_min: Decimal | None = Field(default=None, ge=Decimal("0.00"), decimal_places=2)
    budget_max: Decimal | None = Field(default=None, ge=Decimal("0.00"), decimal_places=2)
    display_location: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None)
    status: JobStatus | None = Field(default=None)


class JobUpdateInternal(JobUpdate):
    """Internal update schema — includes fields the service layer may set."""

    user_id: int | None = Field(default=None)


# ═══════════════════════════════════════════════════════════════════════════════
# Read / Response
# ═══════════════════════════════════════════════════════════════════════════════

class JobRead(BaseModel):
    """Full read schema for Job — returned by API."""

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        extra="forbid",
    )

    id: int
    uuid: UUID
    title: str
    description: str | None
    trade_category_id: int | None
    user_id: int
    budget_min: Decimal | None
    budget_max: Decimal | None
    display_location: str | None
    location: Any | None
    status: str  # use_enum_values=True serializes enum to its string value
    created_at: datetime
    updated_at: datetime | None
    deleted_at: datetime | None
    is_deleted: bool

    # ─── Nested relationships ─────────────────────────────────────────────
    trade_category: TradeCategoryRead | None = None


# ═══════════════════════════════════════════════════════════════════════════════
# Delete
# ═══════════════════════════════════════════════════════════════════════════════

class JobDelete(BaseModel):
    """Response schema after a successful soft-delete."""

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
        extra="forbid",
    )

    id: int
    uuid: UUID
    title: str
    is_deleted: bool
    deleted_at: datetime | None


# ═══════════════════════════════════════════════════════════════════════════════
# Filters (for list/query endpoints)
# ═══════════════════════════════════════════════════════════════════════════════

class JobFilter(BaseModel):
    """Query filter schema for listing/searching jobs."""

    model_config = ConfigDict(extra="forbid")

    status: JobStatus | None = Field(default=None)
    trade_category_id: int | None = Field(default=None)
    user_id: int | None = Field(default=None)
    budget_min: Decimal | None = Field(default=None, ge=Decimal("0.00"), decimal_places=2)
    budget_max: Decimal | None = Field(default=None, ge=Decimal("0.00"), decimal_places=2)
    search: str | None = Field(default=None, max_length=255)
    is_deleted: bool | None = Field(default=None)

    # ─── Pagination ───────────────────────────────────────────────────────
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)
