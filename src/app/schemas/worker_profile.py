from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, field_validator

from .trade_category import TradeCategoryRead
from .user import UserRead


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


class WorkerProfileNestedRead(WorkerProfileBase):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    user: UserRead
    id: int
    is_verified: bool


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


class WorkerProfileUpdateInternal(WorkerProfileBase):
    """Used internally by admin -- can set is_verified and available_since """
    is_verified: Annotated[bool, Field(default=False)] = None
    available_since: Annotated[datetime | None, Field(default=None)] = None


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
    trade_id: int
    skill_level: str
    trade: TradeCategoryRead | None = None


class WorkerProfileWithTradesRead(WorkerProfileNestedRead):
    """Profile response with embedded trades list."""
    trades: list[WorkerTradeNestedRead] = []


class AvailabilityToggleRequest(BaseModel):
    """ PATCH body for toggling availability """
    model_config = ConfigDict(extra="forbid")
    is_available: bool


class AvailabilityToggleResponse(BaseModel):
    """ Response after toggling availability """
    model_config = ConfigDict(from_attributes=True)
    is_available: bool
    available_since: datetime | None = None
