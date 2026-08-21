from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from .job import JobRead
from .worker_profile import WorkerProfileWithTradesRead
from ..models import ApplicationStatus


# ─── Job Application Base ─────────────────────────────────────────────────────────────────────
class JobApplicationBase(BaseModel):
    """ Shared fields """
    model_config = ConfigDict(extra="forbid")

    message: Annotated[str | None, Field(max_length=1000, default=None)]
    status: Annotated[ApplicationStatus, Field(default=ApplicationStatus.PENDING)]


# ─── Job Application Read ─────────────────────────────────────────────────────────────────────
class JobApplicationRead(JobApplicationBase):
    id: int
    job: JobRead | None = None
    worker_profile: WorkerProfileWithTradesRead | None = None


# ─── Job Application Create ─────────────────────────────────────────────────────────────────────
class JobApplicationCreate(JobApplicationBase):
    pass


# ─── Job Application Update ─────────────────────────────────────────────────────────────────────
class JobApplicationUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: ApplicationStatus

# ─── Job Application Update Internal─────────────────────────────────────────────────────────────────────
class JobApplicationUpdateInternal(JobApplicationBase):
    job_id: Annotated[int, Field(gt=0)]
    worker_profile_id: Annotated[int, Field(gt=0)]


# ─── Job Application delete ─────────────────────────────────────────────────────────────────────
class JobApplicationDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
