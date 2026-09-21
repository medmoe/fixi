from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base
from ..core.db.models import TimestampMixin


class Notification(Base, TimestampMixin):
    """A single in-app notification feed item for one user. Distinct from
    NotificationLog (the delivery audit trail) -- this is the user-facing
    record the bell/dropdown and REST endpoints read from."""

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(100), index=True)
    title_ar: Mapped[str] = mapped_column(String(255))
    title_fr: Mapped[str] = mapped_column(String(255))
    body_ar: Mapped[str] = mapped_column(Text())
    body_fr: Mapped[str] = mapped_column(Text())
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None, index=True)
    related_job_id: Mapped[int | None] = mapped_column(ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, default=None, index=True)
