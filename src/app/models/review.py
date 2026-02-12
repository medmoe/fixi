from datetime import UTC, datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


class Review(Base):
    __tablename__ = "review"
    __table_args__ = (CheckConstraint("rating >= 1 AND rating <= 5", name="ck_review_rating_range"),)

    id: Mapped[int] = mapped_column("id", autoincrement=True, nullable=False, unique=True, primary_key=True, init=False)
    job_id: Mapped[int] = mapped_column(ForeignKey("job.id", ondelete="CASCADE"), index=True, unique=True)
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(String(1000), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=lambda: datetime.now(UTC))
