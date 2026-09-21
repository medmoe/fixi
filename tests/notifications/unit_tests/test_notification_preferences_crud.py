import pytest

from src.app.crud.crud_notification_preferences import crud_notification_preferences
from src.app.models import NotificationChannel
from src.app.schemas.notification_preference import NotificationPreferenceRead
from tests.conftest import create_test_user


@pytest.mark.unit
class TestCRUDNotificationPreferenceSetEnabled:
    async def test_creates_a_row_when_none_exists(self, async_session):
        user = await create_test_user(async_session)

        await crud_notification_preferences.set_enabled(
            db=async_session, user_id=user.id, channel=NotificationChannel.PUSH, event_type="job.started", enabled=False
        )

        row = await crud_notification_preferences.get(
            db=async_session, user_id=user.id, channel=NotificationChannel.PUSH, event_type="job.started",
            schema_to_select=NotificationPreferenceRead, return_as_model=True,
        )
        assert row.enabled is False

    async def test_updates_the_existing_row_instead_of_duplicating(self, async_session):
        user = await create_test_user(async_session)

        await crud_notification_preferences.set_enabled(
            db=async_session, user_id=user.id, channel=NotificationChannel.EMAIL, event_type="review_received", enabled=False
        )
        await crud_notification_preferences.set_enabled(
            db=async_session, user_id=user.id, channel=NotificationChannel.EMAIL, event_type="review_received", enabled=True
        )

        rows = await crud_notification_preferences.get_multi(
            db=async_session, user_id=user.id, channel=NotificationChannel.EMAIL, event_type="review_received",
            limit=None, return_as_model=False,
        )
        assert rows["total_count"] == 1
        assert rows["data"][0]["enabled"] is True

    async def test_preferences_for_different_users_are_independent(self, async_session):
        user_a = await create_test_user(async_session)
        user_b = await create_test_user(async_session)

        await crud_notification_preferences.set_enabled(
            db=async_session, user_id=user_a.id, channel=NotificationChannel.PUSH, event_type="job.started", enabled=False
        )

        row_b = await crud_notification_preferences.get(
            db=async_session, user_id=user_b.id, channel=NotificationChannel.PUSH, event_type="job.started",
            schema_to_select=NotificationPreferenceRead, return_as_model=True,
        )
        assert row_b is None
