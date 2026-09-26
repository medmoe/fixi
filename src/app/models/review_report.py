from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base
from ..core.db.models import TimestampMixin


class ReviewReport(Base, TimestampMixin):
    """A single user's report of a review as inappropriate/spam. One row
    per (review, reporter) pair -- the unique constraint is what enforces
    Issue 6's "users can only flag a given review once" acceptance
    criterion, not just the service-layer check."""

    __tablename__ = "review_reports"
    __table_args__ = (UniqueConstraint("review_id", "reporter_id", name="unique_review_reporter"),)

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)

    review_id: Mapped[int] = mapped_column(ForeignKey("reviews.id", ondelete="CASCADE"), index=True)
    reporter_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True, default=None)
