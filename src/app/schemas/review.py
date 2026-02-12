from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rating: Annotated[int, Field(ge=1, le=5)]
    comment: Annotated[str | None, Field(max_length=1000, default=None)]


class ReviewUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rating: Annotated[int | None, Field(ge=1, le=5, default=None)]
    comment: Annotated[str | None, Field(max_length=1000, default=None)]


class ReviewRead(BaseModel):
    id: int
    job_id: int
    rating: int
    comment: str | None
    created_at: datetime


class WorkerRatingSummary(BaseModel):
    worker_user_id: int
    average_rating: float | None
    total_reviews: int
