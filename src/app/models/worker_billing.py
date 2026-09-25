from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, Numeric
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base
from ..core.db.models import TimestampMixin


class WorkerBillingStatus(Enum):
    PENDING = "pending"
    PAID = "paid"
    # Not written automatically by any code yet -- there's no scheduled job
    # flipping records to this ("no automated enforcement yet" per Issue 2).
    # Reserved for when that job exists; until then, read paths derive
    # "is this actually overdue" from due_date themselves (see
    # WorkerBillingRead.is_overdue).
    OVERDUE = "overdue"


class WorkerBilling(Base, TimestampMixin):
    """One flat commission owed for a single completed job -- the billing
    model Phase 8 Issue 2 launches with (a recurring subscription was the
    alternative; deferred, see documentation/PHASE_8_PAYMENTS_ADMIN_ISSUES.md).
    Exactly one row per job (job_id is unique), created automatically when
    that job completes -- see job_lifecycle_service.mark_job_complete."""

    __tablename__ = "worker_billing"

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)

    worker_profile_id: Mapped[int] = mapped_column(ForeignKey("worker_profiles.id", ondelete="CASCADE"), index=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), unique=True, index=True)
    amount_owed: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    amount_paid: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))
    status: Mapped[WorkerBillingStatus] = mapped_column(
        SAEnum(WorkerBillingStatus, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        default=WorkerBillingStatus.PENDING,
        index=True,
    )
    # Set once an admin marks this paid -- the Payment row that recorded it
    # (see PaymentService.record_payment(subscription_id=...)).
    payment_id: Mapped[int | None] = mapped_column(ForeignKey("payments.id", ondelete="SET NULL"), nullable=True, default=None)
