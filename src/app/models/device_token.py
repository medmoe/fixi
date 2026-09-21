from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base
from ..core.db.models import TimestampMixin


class DevicePlatform(Enum):
    WEB = "web"
    IOS = "ios"
    ANDROID = "android"


class DeviceToken(Base, TimestampMixin):
    """A push registration token for one device. A user can have several
    (multiple browser tabs/devices); a token belongs to exactly one user at
    a time -- registering an already-known token (e.g. after a different
    user logs into the same browser) reassigns it rather than duplicating."""

    __tablename__ = "device_tokens"

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(String(500), unique=True)
    platform: Mapped[DevicePlatform] = mapped_column(
        SAEnum(DevicePlatform, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
    )
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True))
