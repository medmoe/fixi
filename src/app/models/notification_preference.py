from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base
from ..core.db.models import TimestampMixin
from .notification_log import NotificationChannel


class NotificationPreference(Base, TimestampMixin):
    """One user's opt-out for a single (channel, event_type) combination
    (Issue 6). Absence of a row means enabled -- this is an opt-out model,
    so every existing user starts with every notification on, matching
    pre-Issue-6 behavior, and NotificationService only needs to check for
    an explicit `enabled=False` override.

    Only PUSH/EMAIL rows are ever written (see TOGGLEABLE_EVENT_CHANNELS in
    services/notifications/event_catalog.py, enforced by the API layer):
    IN_APP is never suppressible (the notification feed always records
    everything) and SMS OTP bypasses this table entirely -- it's a
    mandatory auth requirement (Issue 5), not a preference.
    """

    __tablename__ = "notification_preferences"
    __table_args__ = (UniqueConstraint("user_id", "channel", "event_type", name="uq_notification_preferences_user_channel_event"),)

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    channel: Mapped[NotificationChannel] = mapped_column(
        SAEnum(NotificationChannel, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(100), index=True)
    enabled: Mapped[bool] = mapped_column(default=True)
