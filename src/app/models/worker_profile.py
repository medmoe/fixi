from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


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

    # Portfolio
    # skills: Mapped[list[str]] = mapped_column(JSON, default_factory=list)

    # Trust & ratings
