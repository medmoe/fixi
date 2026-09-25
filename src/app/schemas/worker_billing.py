from datetime import UTC, datetime
from decimal import Decimal

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
