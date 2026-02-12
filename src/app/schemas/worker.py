from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


class WorkerBase(BaseModel):
    service_category_id: int | None = None
    profession: Annotated[
        str,
        Field(
            min_length=2,
            max_length=255,
            examples=["Plumber", "Carpenter", "Electrician"]
        )
    ]
    hourly_rate: Annotated[
        float,
        Field(
            gt=0,
            le=10000,
            examples=[50.0, 75.5, 100.0],
            description="Hourly rate in your currency"
        )
    ]
    skills: list[str] = Field(default_factory=list)
    portfolio_image_urls: list[str] = Field(default_factory=list)
    years_of_experience: Annotated[
        int | None,
        Field(
            ge=0,
            le=100,
            examples=[5, 10, 15],
            default=None
        )
    ]
    bio: Annotated[
        str | None,
        Field(
            max_length=500,
            examples=["Experienced plumber with 10 years in residential and commercial work."],
            default=None
        )
    ]
    availability_status: Annotated[
        Literal["available", "busy", "offline"],
        Field(
            default="available",
            examples=["available"]
        )
    ]


class Worker(WorkerBase):
    user_id: int
    is_verified: bool = False
    average_rating: float | None = None
    total_rating: int = 0


class WorkerRead(BaseModel):
    id: int
    user_id: int
    service_category_id: int | None
    profession: str
    hourly_rate: float
    skills: list[str]
    portfolio_image_urls: list[str]
    years_of_experience: int | None
    is_verified: bool
    bio: str | None
    availability_status: str
    average_rating: float | None
    total_rating: int


class WorkerCreate(WorkerBase):
    model_config = ConfigDict(extra="forbid")

    user_id: int


class WorkerCreateInternal(WorkerCreate):
    """Internal schema for creating worker with defaults."""
    is_verified: bool = False
    average_rating: float | None = None
    total_rating: int = 0


class WorkerUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profession: Annotated[
        str | None,
        Field(
            min_length=2,
            max_length=255,
            examples=["Plumber"],
            default=None
        )
    ]
    hourly_rate: Annotated[
        float | None,
        Field(
            gt=0,
            le=10000,
            examples=[60.0],
            default=None
        )
    ]
    years_of_experience: Annotated[
        int | None,
        Field(
            ge=0,
            le=100,
            examples=[6],
            default=None
        )
    ]
    bio: Annotated[
        str | None,
        Field(
            max_length=500,
            examples=["Updated bio text"],
            default=None
        )
    ]
    availability_status: Annotated[
        Literal["available", "busy", "offline"] | None,
        Field(
            examples=["busy"],
            default=None
        )
    ]


class WorkerUpdateInternal(WorkerUpdate):
    """Internal schema for updating worker including system fields."""
    is_verified: bool | None = None
    average_rating: float | None = None
    total_rating: int | None = None


class WorkerVerificationUpdate(BaseModel):
    """Schema for admin to verify/unverify workers."""
    model_config = ConfigDict(extra="forbid")

    is_verified: bool


class WorkerRatingUpdate(BaseModel):
    """Internal schema for updating cached rating metrics."""
    model_config = ConfigDict(extra="forbid")

    average_rating: float | None
    total_rating: int


class WorkerPublicRead(BaseModel):
    """Public-facing worker profile (hides sensitive info)."""
    id: int
    service_category_id: int | None
    profession: str
    hourly_rate: float
    skills: list[str]
    portfolio_image_urls: list[str]
    years_of_experience: int | None
    is_verified: bool
    bio: str | None
    availability_status: str
    average_rating: float | None
    total_rating: int
    distance_km: float | None = None


class WorkerProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    service_category_id: int | None = None
    profession: Annotated[str | None, Field(min_length=2, max_length=255, default=None)]
    hourly_rate: Annotated[float | None, Field(gt=0, le=10000, default=None)]
    skills: list[str] | None = None
    portfolio_image_urls: list[str] | None = None
