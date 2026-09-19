from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator

from ..models import ApplicationDeclineReason, ApplicationStatus
from .job import JobRead
from .worker_profile import WorkerProfileWithTradesRead


# ─── Job Application Base ─────────────────────────────────────────────────
class JobApplicationBase(BaseModel):
    """Shared fields safe for client input — status is intentionally excluded
    here and only ever set by the server (PENDING on create) or via the
    dedicated JobApplicationUpdate schema used by the job owner."""
    model_config = ConfigDict(extra="forbid")
    message: Annotated[str | None, Field(max_length=1000, default=None)]


# ─── Job Application Read ─────────────────────────────────────────────────
class JobApplicationRead(JobApplicationBase):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True, extra="forbid")
    id: int
    status: ApplicationStatus
    accepted_at: datetime | None = None
    worker_confirmed_at: datetime | None = None
    decline_reason: ApplicationDeclineReason | None = None
    job: JobRead | None = None
    worker_profile: WorkerProfileWithTradesRead | None = None


# ─── Job Application Create ────────────────────────────────────────────────
class JobApplicationCreate(JobApplicationBase):
    """Client-facing create schema. Deliberately has NO status field —
    a worker must never be able to set their own application's status."""
    pass


# ─── Job Application Create Internal ───────────────────────────────────────
class JobApplicationCreateInternal(JobApplicationBase):
    """Service-layer schema for creation. Separate from UpdateInternal even
    though the fields currently overlap, so the two internal schemas can
    diverge independently (e.g. if create ever needs fields update doesn't)."""
    job_id: Annotated[int, Field(gt=0)]
    worker_profile_id: Annotated[int, Field(gt=0)]
    status: ApplicationStatus = Field(default=ApplicationStatus.PENDING)

# ─── Job Application Update ────────────────────────────────────────────────
class JobApplicationUpdate(BaseModel):
    """Job-owner-facing update schema — status transitions only.
    decline_reason is required when rejecting, whether the application was
    still PENDING or had already been ACCEPTED and fell through during the
    pre-assignment discussion — kept structured for future analytics."""
    model_config = ConfigDict(extra="forbid")
    status: ApplicationStatus
    decline_reason: ApplicationDeclineReason | None = None

    @model_validator(mode="after")
    def _validate_decline_reason(self):
        if self.status == ApplicationStatus.REJECTED and self.decline_reason is None:
            raise ValueError("decline_reason is required when rejecting an application")
        if self.status != ApplicationStatus.REJECTED and self.decline_reason is not None:
            raise ValueError("decline_reason is only valid when rejecting an application")
        return self


# ─── Job Application Update Internal ───────────────────────────────────────
class JobApplicationUpdateInternal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: ApplicationStatus
    decline_reason: ApplicationDeclineReason | None = None


# ─── Job Application Withdraw (worker-facing) ──────────────────────────────
class JobApplicationWithdrawRequest(BaseModel):
    """Worker-facing — retract their own pending or accepted application."""
    model_config = ConfigDict(extra="forbid")
    decline_reason: ApplicationDeclineReason


# ─── Job Application Delete ────────────────────────────────────────────────
class JobApplicationDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Annotated[int, Field(gt=0)]
