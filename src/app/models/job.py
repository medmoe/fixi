from datetime import UTC, datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


class JobStatus(str, Enum):
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Job(Base):
    __tablename__ = "job"

    id: Mapped[int] = mapped_column("id", autoincrement=True, nullable=False, unique=True, primary_key=True, init=False)
    customer_id: Mapped[int] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(String(4000))

    service_category_id: Mapped[int | None] = mapped_column(ForeignKey("service_category.id"), index=True, default=None)
    worker_id: Mapped[int | None] = mapped_column(ForeignKey("user.id", ondelete="SET NULL"), index=True, default=None)
    status: Mapped[JobStatus] = mapped_column(
        SQLEnum(JobStatus, name="job_status_type", create_type=False),
        default=JobStatus.OPEN,
        server_default=JobStatus.OPEN.name,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
