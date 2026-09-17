from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict


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
