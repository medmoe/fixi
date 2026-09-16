from sqlalchemy import CheckConstraint, ForeignKey, SmallInteger, String, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base
from ..core.db.models import TimestampMixin
from .user import UserRole


class Review(Base, TimestampMixin):
    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="check_review_rating_range"),
        UniqueConstraint("job_id", "reviewer_id", name="unique_job_reviewer"),
    )

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)

    # ─── Foreign key ────────────────────────────────────────────────────────────────────────────────────────
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    reviewee_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole, values_callable=lambda v: [e.value for e in v]), default=UserRole.CUSTOMER)
    rating: Mapped[int] = mapped_column(SmallInteger, default=1)
    comment: Mapped[str | None] = mapped_column(String(1000), nullable=True, default=None)
    is_flagged: Mapped[bool] = mapped_column(default=False)


