from decimal import Decimal
from enum import Enum

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base
from ..core.db.models import TimestampMixin


class PaymentMethod(Enum):
    CASH = "cash"
    # Not implemented yet -- see ChargilyProvider in services/payments/providers.py.
    # Listed here now so the column's enum type never needs an ALTER TYPE
    # migration just to accept it once that provider ships.
    CHARGILY = "chargily"


class PaymentStatus(Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class Payment(Base, TimestampMixin):
    """One payment record, written by whichever PaymentProvider handled it
    (see services/payments/). This *is* the payment ledger, not just an
    audit log of attempts -- unlike notification_logs, which logs dispatch
    attempts for state that lives elsewhere (notifications table)."""

    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)

    # ─── Parties & amount (required) ─────────────────────────────────────
    payer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    method: Mapped[PaymentMethod] = mapped_column(
        SAEnum(PaymentMethod, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        index=True,
    )

    # ─── What this payment is for ────────────────────────────────────────
    # Exactly one of these is expected to be set (a job payment or a
    # worker commission/subscription payment), enforced at the service
    # layer rather than a DB constraint since both are legitimately
    # nullable on their own (a payment isn't required to reference a job).
    job_id: Mapped[int | None] = mapped_column(ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, default=None, index=True)
    # use_alter=True: worker_billing.payment_id references payments.id right
    # back (set once an admin marks a billing record paid), so these two
    # tables have a genuine FK cycle. This tells SQLAlchemy's DDL generator
    # to create this constraint in a separate ALTER TABLE after both tables
    # exist, instead of failing to topologically sort them.
    subscription_id: Mapped[int | None] = mapped_column(
        ForeignKey("worker_billing.id", ondelete="SET NULL", use_alter=True, name="payments_subscription_id_fkey"),
        nullable=True, default=None, index=True,
    )

    # Null means the platform itself (e.g. a worker's commission payment
    # has no User payee) rather than a specific recipient user.
    payee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, default=None, index=True)
    # Who recorded this payment (admin or worker, per CashProvider's docs).
    # Null means it was recorded automatically by a provider (e.g. a future
    # Chargily webhook), not entered by hand.
    recorded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, default=None, index=True)

    status: Mapped[PaymentStatus] = mapped_column(
        SAEnum(PaymentStatus, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        default=PaymentStatus.PENDING,
        index=True,
    )
