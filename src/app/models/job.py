from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.database import Base
from ..core.db.models import SoftDeleteMixin, TimestampMixin, UUIDMixin
from ..core.db.types import PostGISPoint

if TYPE_CHECKING:
    from ..models import TradeCategory, User


class JobStatus(Enum):
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Job(Base, TimestampMixin, SoftDeleteMixin, UUIDMixin):
    __tablename__ = "jobs"
    __table_args__ = (
        CheckConstraint("budget_max IS NULL OR budget_min IS NULL OR budget_max >= budget_min", name="check_budget_range"),
        Index('idx_jobs_location_gist', 'location', postgresql_using='gist'),
        # Powers analytics date-range filtering (Phase 8 Issue 8) --
        # created_at isn't indexed by TimestampMixin itself.
        Index('ix_jobs_created_at', 'created_at'),
    )

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text())

    # ─── Foreign key ────────────────────────────────────────────────────────────────────────────────────────
    trade_category_id: Mapped[int | None] = mapped_column(ForeignKey("trade_categories.id", ondelete='SET NULL'), nullable=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete='CASCADE'), index=True)

    # ─── Budget ──────────────────────────────────────────────────────────────────────────────────────────────
    budget_min: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    budget_max: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))

    # ─── Location ──────────────────────────────────────────────────────────────────────────────────────────────
    display_location: Mapped[str | None] = mapped_column(String(255), default=None)
    location: Mapped[str | None] = mapped_column(PostGISPoint(), default=None)

    # ─── Relationship ──────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="jobs", lazy='raise', init=False)
    trade_category: Mapped["TradeCategory"] = relationship("TradeCategory", back_populates="jobs", lazy='raise', init=False)

    # ─── Job status ──────────────────────────────────────────────────────────
    status: Mapped[JobStatus] = mapped_column(
        SAEnum(JobStatus, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        nullable=False,
        default=JobStatus.OPEN,
        index=True
    )

    # ─── Mutual completion confirmation ─────────────────────────────────────
    # status flips to COMPLETED once both are set — neither party can force
    # completion unilaterally.
    customer_marked_complete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    worker_marked_complete_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
