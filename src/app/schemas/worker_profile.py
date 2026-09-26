from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Annotated

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, computed_field, field_validator, model_validator

from .trade_category import TradeCategoryRead
from .user import UserPublicRead


class WorkerProfileBase(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)
    bio: Annotated[str | None, Field(max_length=1000, examples=["Experienced plumber with 10 years in residential and commercial work."], default=None)]
    years_of_experience: Annotated[int | None, Field(ge=0, le=100, examples=[5, 10, 15], default=None)]
    hourly_rate: Annotated[Decimal | None, Field(ge=0, decimal_places=2, examples=[50.00, 75.50, 100.00], default=None)]
    service_radius_km: Annotated[int | None, Field(ge=0, examples=[5, 10, 15], default=None)]
    avatar_url: Annotated[str | None, Field(max_length=255, examples=["https://example.com/avatar.jpg"], default=None)]
    is_available: Annotated[bool, Field(default=True)]

    @field_validator("avatar_url", mode="before")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v is not None:
            AnyHttpUrl(v)
        return v


class WorkerProfileRead(WorkerProfileBase):
    """Returned to clients -- include read-only fields."""
    model_config = ConfigDict(extra="forbid", from_attributes=True)
    id: int
    user_id: int
    is_verified: bool
    available_since: Annotated[datetime | None, Field(default=None)] = None
    average_rating: Annotated[Decimal | None, Field(default=None)] = None
    review_count: Annotated[int, Field(default=0)] = 0
    no_show_count: Annotated[int, Field(default=0)] = 0
    # exclude=True, not just omitted -- FastCRUD's update(..., return_as_model=True)
    # always RETURNINGs every model column regardless of schema_to_select
    # (see execute_update_and_return_response), so schema_to_select must
    # declare every model column or construction itself raises
    # extra_forbidden. exclude=True keeps this off every serialized
    # response (public search results included) while still satisfying
    # that construction -- the raw key is only ever read through
    # get_verification_document_url's presigned URL.
    cni_document_key: Annotated[str | None, Field(default=None, exclude=True)] = None

    @computed_field
    def has_cni_document(self) -> bool:
        """Safe to expose (unlike cni_document_key itself) -- lets the
        worker's own dashboard distinguish "never uploaded" from "uploaded,
        awaiting review" while is_verified alone can't."""
        return self.cni_document_key is not None


class WorkerProfileCreate(WorkerProfileBase):
    """Used by workers to create their profile"""
    model_config = ConfigDict(extra="forbid", from_attributes=True)  # tells pydantic to read data from object attributes instead of only from dictionaries
    user_id: int


class WorkerProfileUpdate(BaseModel):
    """PATCH semantics -- All fields optional, only send what changed"""
    model_config = ConfigDict(extra="forbid")
    bio: Annotated[str | None, Field(max_length=1000, default=None)] = None
    years_of_experience: Annotated[int | None, Field(ge=0, le=100, default=None)] = None
    hourly_rate: Annotated[Decimal | None, Field(ge=0, decimal_places=2, default=None)] = None
    service_radius_km: Annotated[int | None, Field(ge=0, default=None)] = None
    avatar_url: Annotated[str | None, Field(max_length=255, default=None)] = None
    is_available: Annotated[bool | None, Field(default=None)] = None

    @field_validator("avatar_url", mode="before")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v is not None:
            AnyHttpUrl(v)
        return v


class WorkerProfileUpdateInternal(BaseModel):
    """Used internally by admin -- can set is_verified, is_available, and available_since """
    is_verified: Annotated[bool | None, Field(default=False)] = None
    is_available: Annotated[bool | None, Field(default=False)] = None
    available_since: Annotated[datetime | None, Field(default=None)] = None
    cni_document_key: Annotated[str | None, Field(default=None)] = None


class WorkerProfileDelete(BaseModel):
    """Deactivate a worker profile"""
    model_config = ConfigDict(extra="forbid")
    id: int


class WorkerProfileCreateRequest(BaseModel):
    """POST body — user_id comes from JWT, not the request."""
    model_config = ConfigDict(extra="forbid")
    bio: Annotated[str | None, Field(max_length=1000, default=None)]
    years_of_experience: Annotated[int | None, Field(ge=0, le=100, default=None)]
    hourly_rate: Annotated[Decimal | None, Field(gt=0, decimal_places=2, default=None)]
    service_radius_km: Annotated[int | None, Field(ge=1, le=500, default=None)]
    avatar_url: Annotated[str | None, Field(max_length=255, default=None)]
    is_available: Annotated[bool, Field(default=True)]

    @field_validator("avatar_url", mode="before")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v is not None:
            AnyHttpUrl(v)
        return v


class WorkerTradeNestedRead(BaseModel):
    """Trade assignment nested in profile response — no circular import from worker_trade.py."""
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)
    id: int
    worker_profile_id: int
    trade_category_id: int
    skill_level: str
    trade_category: TradeCategoryRead | None = None


class WorkerProfileWithTradesRead(WorkerProfileRead):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    """Profile response with embedded trades list."""
    trade_categories: list[WorkerTradeNestedRead] = Field(default_factory=list, validation_alias="worker_trades")
    user: UserPublicRead | None = None
    # Only set by geo searches (worker search with lat/lng, a job's nearby
    # workers) -- not a model column, so never part of an UPDATE RETURNING.
    distance_km: float | None = None
    # Only set by searches: the worker's first portfolio photo, for result cards.
    cover_image_url: str | None = None


class AvailabilityToggleRequest(BaseModel):
    """ PATCH body for toggling availability """
    model_config = ConfigDict(extra="forbid")
    is_available: bool


class WorkerSortBy(str, Enum):
    distance = "distance"
    hourly_rate = "hourly_rate"
    experience = "experience"
    rating = "rating"


class WorkerProfileFilter(BaseModel):
    trade_category_id: int | None = Field(default=None)
    min_hourly_rate: Decimal | None = Field(default=None, ge=0)
    max_hourly_rate: Decimal | None = Field(default=None, ge=0)
    min_years_of_experience: int | None = Field(default=None, ge=0, le=100)
    max_years_of_experience: int | None = Field(default=None, ge=0, le=100)
    service_radius_km: int | None = Field(default=None, ge=0)
    is_available: bool | None = Field(default=None)
    is_verified: bool | None = Field(default=None)

    # ─── Geo search params ──────────────────────────────────────────────
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    radius_km: int | None = Field(default=None, ge=1, le=200)

    # ─── Sorting ────────────────────────────────────────────────────────
    sort_by: WorkerSortBy = Field(default=WorkerSortBy.distance)

    @model_validator(mode="after")
    def validate_hourly_rate_range(self):
        if (
                self.min_hourly_rate is not None
                and self.max_hourly_rate is not None
                and self.max_hourly_rate < self.min_hourly_rate
        ):
            raise ValueError("max_hourly_rate must be greater than or equal to min_hourly_rate")
        return self

    @model_validator(mode="after")
    def validate_experience_range(self):
        if (
                self.min_years_of_experience is not None
                and self.max_years_of_experience is not None
                and self.max_years_of_experience < self.min_years_of_experience
        ):
            raise ValueError("max_years_of_experience must be greater than or equal to min_years_of_experience")
        return self

    @model_validator(mode="after")
    def validate_geo_coordinates_provided_together(self):
        # requires both latitude AND longitude — 422 if only one provided
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Both latitude and longitude must be provided together for geo search.")
        return self

    @property
    def is_geo_search(self) -> bool:
        """True when the caller supplied coordinates and wants a geo-filtered search."""
        return self.latitude is not None and self.longitude is not None


#
# -------------------------------------------------------------------------
# Admin CNI verification queue (Phase 8 Issue 5)
# -------------------------------------------------------------------------
#

class WorkerVerificationQueueRead(BaseModel):
    """One row in the admin verification queue -- deliberately never
    includes the raw cni_document_key (see MinioClient.generate_presigned_get_url,
    fetched through a separate endpoint instead)."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    email: str
    bio: str | None = None
    years_of_experience: int | None = None


class WorkerVerificationRejectRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: Annotated[str, Field(min_length=1, max_length=1000)]
