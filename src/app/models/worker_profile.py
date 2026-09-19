from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.database import Base

if TYPE_CHECKING:
    from .user import User
    from .worker_trade import WorkerTrade


class WorkerProfile(Base):
    __tablename__ = "worker_profiles"

    id: Mapped[int] = mapped_column(
        autoincrement=True, primary_key=True, unique=True, nullable=False, init=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )

    # Profile fields
    bio: Mapped[str | None] = mapped_column(String(1000), default=None)
    years_of_experience: Mapped[int | None] = mapped_column(default=None)
    hourly_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), default=None)
    service_radius_km: Mapped[int | None] = mapped_column(default=None)
    avatar_url: Mapped[str | None] = mapped_column(String(255), default=None)
    is_available: Mapped[bool] = mapped_column(default=True)
    available_since: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    is_verified: Mapped[bool] = mapped_column(default=False)

    # relationships
    user: Mapped["User"] = relationship("User", lazy="raise", init=False)
    worker_trades: Mapped[list["WorkerTrade"]] = relationship("WorkerTrade", back_populates="worker_profile", lazy="raise", init=False, passive_deletes=True)

    # rating
    average_rating: Mapped[Decimal | None] = mapped_column(Numeric(3, 2), default=None)
    review_count: Mapped[int] = mapped_column(default=0)

    # Reliability -- incremented when a job with this worker times out
    # waiting on their confirmation/completion response. Tracked separately
    # from average_rating (a reliability signal, not a work-quality one);
    # not yet factored into search ranking or display.
    no_show_count: Mapped[int] = mapped_column(default=0)

    # Portfolio
    # skills: Mapped[list[str]] = mapped_column(JSON, default_factory=list)

    # Trust & ratings
