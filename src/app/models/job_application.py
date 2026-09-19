from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.database import Base
from ..core.db.models import TimestampMixin

if TYPE_CHECKING:
    from .job import Job
    from .worker_profile import WorkerProfile


class ApplicationStatus(Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class ApplicationDeclineReason(Enum):
    """Why an application was rejected or withdrawn -- required whenever
    status moves to REJECTED, whether the application was still PENDING or
    had already been ACCEPTED and fell through during the pre-assignment
    discussion. Kept as structured data for future analytics."""
    PRICE_DISAGREEMENT = "price_disagreement"
    SCHEDULE_CONFLICT = "schedule_conflict"
    SCOPE_MISMATCH = "scope_mismatch"
    WORKER_UNAVAILABLE = "worker_unavailable"
    UNRESPONSIVE = "unresponsive"
    ANOTHER_APPLICANT_SELECTED = "another_applicant_selected"  # system-set: a different applicant reached mutual confirmation first
    OTHER = "other"


class JobApplication(Base, TimestampMixin):
    __tablename__ = "job_applications"
    __table_args__ = (UniqueConstraint("job_id", "worker_profile_id", name="unique_job_application"),)

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    worker_profile_id: Mapped[int] = mapped_column(ForeignKey("worker_profiles.id", ondelete="CASCADE"), index=True)
    message: Mapped[str | None] = mapped_column(Text(), default=None)
    status: Mapped[ApplicationStatus] = mapped_column(SAEnum(ApplicationStatus, values_callable=lambda v: [e.value for e in v]), nullable=False, default=ApplicationStatus.PENDING)

    # ─── Mutual assignment confirmation ─────────────────────────────────────
    # status=ACCEPTED is the customer's half; this is the worker's half. Job
    # flips to ASSIGNED (and every other application auto-rejects) once both are set.
    worker_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    decline_reason: Mapped[ApplicationDeclineReason | None] = mapped_column(
        SAEnum(ApplicationDeclineReason, values_callable=lambda v: [e.value for e in v]), nullable=True, default=None
    )

    # relationships
    job: Mapped['Job'] = relationship("Job", lazy='raise', init=False)
    worker_profile: Mapped['WorkerProfile'] = relationship("WorkerProfile", lazy="raise", init=False)
