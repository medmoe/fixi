from enum import Enum

from sqlalchemy import Enum as SAEnum
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base
from ..core.db.models import TimestampMixin


class NotificationChannel(Enum):
    IN_APP = "in_app"
    PUSH = "push"
    EMAIL = "email"
    SMS = "sms"


class NotificationLogStatus(Enum):
    SENT = "sent"
    FAILED = "failed"


class NotificationLog(Base, TimestampMixin):
    """Audit trail of every notification dispatch attempt, written by
    NotificationService regardless of which channel/provider handled it."""

    __tablename__ = "notification_logs"

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)
    event_type: Mapped[str] = mapped_column(String(100), index=True)
    channel: Mapped[NotificationChannel] = mapped_column(
        SAEnum(NotificationChannel, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        index=True,
    )
    provider: Mapped[str] = mapped_column(String(50))
    status: Mapped[NotificationLogStatus] = mapped_column(
        SAEnum(NotificationLogStatus, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        index=True,
    )
    error: Mapped[str | None] = mapped_column(Text(), nullable=True, default=None)
