from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum, Text
from sqlalchemy import ForeignKey, UniqueConstraint
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


class JobApplication(Base, TimestampMixin):
    __tablename__ = "job_applications"
    __table_args__ = (UniqueConstraint("job_id", "worker_profile_id", name="unique_job_application"),)

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    worker_profile_id: Mapped[int] = mapped_column(ForeignKey("worker_profiles.id", ondelete="CASCADE"), index=True)
    message: Mapped[str | None] = mapped_column(Text(), default=None)
    status: Mapped[ApplicationStatus] = mapped_column(SAEnum(ApplicationStatus, values_callable=lambda v: [e.value for e in v]), nullable=False, default=ApplicationStatus.PENDING)

    # relationships
    job: Mapped['Job'] = relationship("Job", lazy='raise', init=False)
    worker_profile: Mapped['WorkerProfile'] = relationship("WorkerProfile", lazy="raise", init=False)
