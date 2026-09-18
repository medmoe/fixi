from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from ..models import UserRole


class ReviewSortBy(str, Enum):
    recent = "recent"
    highest_rated = "highest_rated"


class ReviewPublicRead(BaseModel):
    """A single review as shown on a worker's public profile page.
    Never includes the reviewer's user_id or full name."""
    model_config = ConfigDict(extra="forbid")
    id: int
    rating: int
    comment: str | None
    reviewer_display_name: str
    created_at: datetime


class WorkerReviewsMeta(BaseModel):
    model_config = ConfigDict(extra="forbid")
    average_rating: Decimal | None
    review_count: int
    total_pages: int
    rating_breakdown: dict[int, int]


class WorkerReviewsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    data: list[ReviewPublicRead]
    next_cursor: str | None
    meta: WorkerReviewsMeta


class ReviewEligibilityReason(str, Enum):
    already_submitted = "already_submitted"
    job_not_complete = "job_not_complete"
    not_a_participant = "not_a_participant"


class ReviewEligibility(BaseModel):
    model_config = ConfigDict(extra="forbid")
    can_review: bool
    reason: ReviewEligibilityReason | None = None


class ReviewCreateRequest(BaseModel):
    """POST body -- job_id comes from the path, reviewer/reviewee/role are
    determined server-side from the caller's relationship to the job, never
    accepted from the client."""
    model_config = ConfigDict(extra="forbid")
    rating: Annotated[int, Field(ge=1, le=5)]
    comment: Annotated[str | None, Field(max_length=1000, default=None)] = None


class ReviewSubmitResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)
    id: int
    rating: int
    comment: str | None
    role: UserRole
    created_at: datetime


class WorkerReviewEligibility(BaseModel):
    """Powers the 'Leave a review' CTA on a worker's public profile page --
    unlike ReviewEligibility (job-scoped), this aggregates across all of the
    caller's jobs with this specific worker."""
    model_config = ConfigDict(extra="forbid")
    can_review: bool
    job_id: int | None = None
