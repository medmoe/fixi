from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from ..models.job import JobStatus


class Job(BaseModel):
    """Legacy task-queue response schema."""

    id: str


class JobCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    service_category_id: int | None = None
    worker_id: int | None = None
    title: Annotated[str, Field(min_length=2, max_length=200)]
    description: Annotated[str, Field(min_length=2, max_length=4000)]


class JobRead(BaseModel):
    id: int
    service_category_id: int | None
    customer_id: int
    worker_id: int | None
    title: str
    description: str
    status: JobStatus
    created_at: datetime
    updated_at: datetime | None


class JobAssign(BaseModel):
    model_config = ConfigDict(extra="forbid")

    worker_id: int


class JobStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: JobStatus
