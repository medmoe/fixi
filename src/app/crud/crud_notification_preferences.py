from fastcrud import FastCRUD
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import NotificationChannel, NotificationPreference
from ..schemas.notification_preference import (
    NotificationPreferenceCreateInternal,
    NotificationPreferenceDelete,
    NotificationPreferenceRead,
    NotificationPreferenceUpdateInternal,
)


class CRUDNotificationPreference(
    FastCRUD[
        NotificationPreference,
        NotificationPreferenceCreateInternal,
        NotificationPreferenceUpdateInternal,
        NotificationPreferenceUpdateInternal,
        NotificationPreferenceDelete,
        NotificationPreferenceRead,
    ]
):
    async def set_enabled(self, db: AsyncSession, *, user_id: int, channel: NotificationChannel, event_type: str, enabled: bool) -> None:
        """Upsert by (user_id, channel, event_type) -- one row per
        combination, so toggling a switch twice never creates duplicates."""
        existing = await self.exists(db=db, user_id=user_id, channel=channel, event_type=event_type)
        if existing:
            await self.update(
                db=db,
                object=NotificationPreferenceUpdateInternal(enabled=enabled),
                user_id=user_id,
                channel=channel,
                event_type=event_type,
            )
        else:
            await self.create(
                db=db,
                object=NotificationPreferenceCreateInternal(user_id=user_id, channel=channel, event_type=event_type, enabled=enabled),
            )


crud_notification_preferences: CRUDNotificationPreference = CRUDNotificationPreference(NotificationPreference)
