from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator

from ..models.job import JobStatus
from .trade_category import TradeCategoryRead

# ─── Base ─────────────────────────────────────────────────────────────────────

class JobBase(BaseModel):
    """Shared fields."""
    model_config = ConfigDict(extra="forbid")

    title: Annotated[str, Field(min_length=1, max_length=255)]
    description: str | None = Field(default=None)
    trade_category_id: int | None = Field(default=None)
    budget_min: Annotated[Decimal | None, Field(ge=Decimal("0.00"), decimal_places=2, default=None)]
    budget_max: Annotated[Decimal | None, Field(ge=Decimal("0.00"), decimal_places=2, default=None)]
    display_location: Annotated[str | None, Field(max_length=255, default=None)]


# ─── Create ───────────────────────────────────────────────────────────────────

class JobCreate(JobBase):
    """Client-facing create schema — lat/lng accepted, user_id from JWT."""
    latitude: Annotated[float, Field(ge=-90, le=90)] | None = None
    longitude: Annotated[float, Field(ge=-180, le=180)] | None = None

    @model_validator(mode='after')
    def validate_budget_range(self):
        if self.budget_min is not None and self.budget_max is not None and self.budget_max < self.budget_min:
            raise ValueError("Budget max must be greater than or equal to budget min.")
        return self

    @model_validator(mode='after')
    def validate_coordinates(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Both latitude and longitude must be provided together.")
        return self


class JobCreateInternal(JobCreate):
    """Service layer schema — adds user_id and builds WKT location."""
    location: str | None = Field(default=None)  # built by LocationBuilderMixin
    user_id: int
    status: JobStatus = Field(default=JobStatus.OPEN)
    latitude: Annotated[float | None, Field(default=None, exclude=True)] = None
    longitude: Annotated[float | None, Field(default=None, exclude=True)] = None


# ─── Update ───────────────────────────────────────────────────────────────────

class JobUpdate(BaseModel):
    """Client-facing partial update — all fields optional."""
    model_config = ConfigDict(extra='forbid')
    title: Annotated[str | None, Field(min_length=1, max_length=255, default=None)] = None
    description: Annotated[str | None, Field(default=None)] = None
    trade_category_id: str | None = None
    budget_min: Annotated[Decimal | None, Field(ge=Decimal("0.00"), decimal_places=2, default=None)] = None
    budget_max: Annotated[Decimal | None, Field(ge=Decimal("0.00"), decimal_places=2, default=None)] = None
    display_location: Annotated[str | None, Field(max_length=255, default=None)] = None

    status: JobStatus | None = Field(default=None)
    latitude: Annotated[float, Field(ge=-90, le=90)] | None = None
    longitude: Annotated[float, Field(ge=-180, le=180)] | None = None

    @model_validator(mode='after')
    def validate_budget_range(self):
        if self.budget_min is not None and self.budget_max is not None and self.budget_max < self.budget_min:
            raise ValueError("Budget max must be greater than or equal to budget min.")
        return self

    @model_validator(mode='after')
    def validate_coordinates(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Both latitude and longitude must be provided together.")
        return self


class JobUpdateInternal(JobUpdate):
    """Service layer update — adds user_id and updated_at."""
    location: str | None = Field(default=None)
    user_id: Annotated[int, Field(gt=0)]
    updated_at: datetime | None = Field(default=None)  # ✅ set by CRUD layer
    latitude: Annotated[float | None, Field(default=None, exclude=True)] = None
    longitude: Annotated[float | None, Field(default=None, exclude=True)] = None


# ─── Read ─────────────────────────────────────────────────────────────────────

class JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True, extra="forbid")

    id: int
    uuid: UUID
    title: str
    description: str | None
    trade_category_id: int | None
    user_id: int
    budget_min: Decimal | None
    budget_max: Decimal | None
    display_location: str | None
    location: str | None = Field(default=None, exclude=True)  # raw WKT — hidden
    status: str
    created_at: datetime
    updated_at: datetime | None
    deleted_at: datetime | None
    is_deleted: bool
    trade_category: TradeCategoryRead | None = None

    @computed_field
    def coordinates(self) -> dict[str, float] | None:
        """Parse WKT POINT to lat/lng for frontend consumption."""
        if not self.location:
            return None
        try:
            coords = self.location.replace("POINT(", "").replace(")", "").split()
            return {"longitude": float(coords[0]), "latitude": float(coords[1])}
        except (ValueError, IndexError):
            return None


# ─── Delete ───────────────────────────────────────────────────────────────────

class JobDelete(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    id: int
    uuid: UUID
    title: str
    is_deleted: bool
    deleted_at: datetime | None


# ─── Filter + Pagination ──────────────────────────────────────────────────────

class PaginationParams(BaseModel):
    model_config = ConfigDict(extra="forbid")
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)

class JobFilter(BaseModel):
    status: JobStatus | None = Field(default=None)
    trade_category_id: int | None = Field(default=None)
    user_id: int | None = Field(default=None)
    budget_min: Decimal | None = Field(default=None, ge=Decimal("0.00"), decimal_places=2)
    budget_max: Decimal | None = Field(default=None, ge=Decimal("0.00"), decimal_places=2)
    search: str | None = Field(default=None, max_length=255)
    is_deleted: bool = Field(default=False)  # ✅ never expose deleted by default
