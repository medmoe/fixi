from datetime import UTC, datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, computed_field

from ..core.schemas import TimestampSchema
from ..models.worker_billing import WorkerBillingStatus


class WorkerBillingBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    worker_profile_id: int
    job_id: int
    amount_owed: Decimal
    due_date: datetime
    amount_paid: Decimal = Decimal("0.00")
    status: WorkerBillingStatus = WorkerBillingStatus.PENDING
    payment_id: int | None = None
    invoice_key: str | None = None


class WorkerBillingCreateInternal(WorkerBillingBase):
    pass


class WorkerBillingUpdateInternal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    amount_paid: Decimal | None = None
    status: WorkerBillingStatus | None = None
    payment_id: int | None = None
    invoice_key: str | None = None


class WorkerBillingRead(TimestampSchema, WorkerBillingBase):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: int

    @computed_field
    def is_overdue(self) -> bool:
        """Derived, not stored -- see WorkerBillingStatus.OVERDUE's
        docstring for why this isn't a persisted status transition yet."""
        return self.status == WorkerBillingStatus.PENDING and self.due_date < datetime.now(UTC)


#
# -------------------------------------------------------------------------
# Admin dashboard (Phase 8 Issue 6)
# -------------------------------------------------------------------------
#

class WorkerBillingAdminRead(BaseModel):
    """One row in the admin commission dashboard -- includes the worker's
    name/email (joined from User) so the table is actually usable, unlike
    the bare worker_profile_id on WorkerBillingRead."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    worker_profile_id: int
    worker_name: str
    worker_email: str
    job_id: int
    amount_owed: Decimal
    amount_paid: Decimal
    due_date: datetime
    status: WorkerBillingStatus
    payment_id: int | None = None
    created_at: datetime

    @computed_field
    def is_overdue(self) -> bool:
        return self.status == WorkerBillingStatus.PENDING and self.due_date < datetime.now(UTC)


class WorkerBillingDisplayStatus(str, Enum):
    """UI-facing status -- splits the raw PENDING status into pending vs.
    overdue (see WorkerBillingStatus.OVERDUE's docstring: overdue is never
    actually persisted, only derived at read time from due_date)."""
    pending = "pending"
    paid = "paid"
    overdue = "overdue"


class WorkerBillingAdminFilter(BaseModel):
    """Query params for GET /worker-billing (admin) and
    /worker-billing/export -- the same filters drive both, so the exported
    CSV can never disagree with what's shown on screen."""

    worker_profile_id: int | None = None
    status: WorkerBillingDisplayStatus | None = None
    due_date_from: datetime | None = None
    due_date_to: datetime | None = None
