from datetime import datetime, UTC

from sqlalchemy import DateTime, ForeignKey, String, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base

class Worker(Base):
    __tablename__ = 'worker'

    id: Mapped[int] = mapped_column("id", autoincrement=True, nullable=False, unique=True, primary_key=True, init=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True)

    # Worker-specific fields
    profession: Mapped[str] = mapped_column(String(255)) # e.g. "Plumber", "Carpenter", "Engineer"
    hourly_rate: Mapped[float] = mapped_column(Float)
    years_of_experience: Mapped[int | None] = mapped_column(default=None)
    is_verified: Mapped[bool] = mapped_column(default=False)
    bio: Mapped[str | None] = mapped_column(String(500), default=None)
    availability_status: Mapped[str] = mapped_column(String(50), default="available")

    # Cached rating metrics (updated periodically or on each new rating)
    average_rating: Mapped[float | None] = mapped_column(Float, default=None, index=True)
    total_rating: Mapped[int] = mapped_column(Integer, default=0, index=True)



