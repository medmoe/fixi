from unittest.mock import AsyncMock, patch

import pytest

from src.app.models import NotificationChannel
from src.app.services.notifications.events import notify_user


@pytest.mark.unit
class TestNotifyUser:
    @patch("src.app.services.notifications.events.NotificationService")
    async def test_without_email_payload_only_sends_in_app_and_push(self, mock_service_cls, async_session):
        mock_service = mock_service_cls.return_value
        mock_service.send = AsyncMock(return_value=[])

        await notify_user(
            async_session, event_type="job.started", user_id=1,
            title_ar="عنوان", title_fr="Titre", title_en="Title", body_ar="نص", body_fr="Corps", body_en="Body",
        )

        event = mock_service.send.await_args.args[1]
        assert event.channels == (NotificationChannel.IN_APP, NotificationChannel.PUSH)
        assert NotificationChannel.EMAIL not in event.recipients

    @patch("src.app.services.notifications.events.NotificationService")
    async def test_with_email_payload_also_sends_email_to_the_same_user(self, mock_service_cls, async_session):
        mock_service = mock_service_cls.return_value
        mock_service.send = AsyncMock(return_value=[])

        await notify_user(
            async_session, event_type="review_received", user_id=42,
            title_ar="عنوان", title_fr="Titre", title_en="Title", body_ar="نص", body_fr="Corps", body_en="Body",
            email_payload={"reviewer_name": "Karim", "rating": "5"},
        )

        event = mock_service.send.await_args.args[1]
        assert NotificationChannel.EMAIL in event.channels
        assert event.recipients[NotificationChannel.EMAIL] == "42"
        assert event.payload["reviewer_name"] == "Karim"
        assert event.payload["rating"] == "5"
        # bilingual fields are still present for the other channels
        assert event.payload["title_fr"] == "Titre"

    @patch("src.app.services.notifications.events.NotificationService")
    async def test_swallows_and_logs_a_send_failure_instead_of_raising(self, mock_service_cls, async_session):
        mock_service = mock_service_cls.return_value
        mock_service.send = AsyncMock(side_effect=RuntimeError("boom"))

        await notify_user(
            async_session, event_type="job.started", user_id=1,
            title_ar="عنوان", title_fr="Titre", title_en="Title", body_ar="نص", body_fr="Corps", body_en="Body",
        )  # must not raise
