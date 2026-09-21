from typing import Any

import pytest
from sqlalchemy import select

from src.app.crud.crud_notification_preferences import crud_notification_preferences
from src.app.models import Notification, NotificationChannel, NotificationLog, NotificationLogStatus
from src.app.services.notifications import DeliveryResult, NotificationEvent, NotificationProvider, NotificationService, connection_manager
from tests.conftest import create_test_user
from tests.job.helpers import create_test_job
from tests.notifications.unit_tests.test_ws_manager import FakeWebSocket

IN_APP_PAYLOAD = {
    "title_ar": "عنوان",
    "title_fr": "Titre",
    "body_ar": "نص",
    "body_fr": "Corps",
}


class FakeProvider(NotificationProvider):
    """Records every call; can be told to fail N times before succeeding,
    or to always raise -- so retry/error paths are exercised without
    touching a real SDK."""

    def __init__(self, name: str = "fake", fail_times: int = 0, raise_exc: Exception | None = None) -> None:
        self.name = name
        self.calls: list[tuple[str, str, dict[str, Any]]] = []
        self._fail_times = fail_times
        self._raise_exc = raise_exc

    async def send(self, db, recipient: str, template: str, payload: dict[str, Any]) -> DeliveryResult:
        self.calls.append((recipient, template, payload))
        if self._raise_exc is not None:
            raise self._raise_exc
        if len(self.calls) <= self._fail_times:
            return DeliveryResult(success=False, provider=self.name, error="simulated failure")
        return DeliveryResult(success=True, provider=self.name)


async def _log_rows(async_session, event_type: str) -> list[NotificationLog]:
    result = await async_session.execute(select(NotificationLog).where(NotificationLog.event_type == event_type))
    return list(result.scalars().all())


@pytest.mark.unit
class TestNotificationServiceSend:
    async def test_sends_to_every_channel_in_the_event(self, async_session):
        push = FakeProvider(name="fake-push")
        email = FakeProvider(name="fake-email")
        service = NotificationService(push_provider=push, email_provider=email)

        event = NotificationEvent(
            event_type="job.status_changed",
            channels=(NotificationChannel.PUSH, NotificationChannel.EMAIL),
            recipients={NotificationChannel.PUSH: "user-topic-1", NotificationChannel.EMAIL: "jane@example.com"},
            template="job_status_changed",
            payload={"title": "Job started"},
        )

        results = await service.send(async_session, event)

        assert [r.success for r in results] == [True, True]
        assert push.calls == [("user-topic-1", "job_status_changed", {"title": "Job started"})]
        assert email.calls == [("jane@example.com", "job_status_changed", {"title": "Job started"})]

    async def test_in_app_channel_persists_a_notification_row(self, async_session):
        user = await create_test_user(async_session)
        service = NotificationService()

        event = NotificationEvent(
            event_type="job.status_changed",
            channels=(NotificationChannel.IN_APP,),
            recipients={NotificationChannel.IN_APP: str(user.id)},
            template="job_status_changed",
            payload=IN_APP_PAYLOAD,
        )

        results = await service.send(async_session, event)

        assert results[0].success is True
        assert results[0].provider == "in_app"

    async def test_in_app_channel_fails_without_a_provider(self, async_session):
        """No provider is needed for in-app -- it always persists -- but a
        channel still needs a recipient like every other channel."""
        service = NotificationService()

        event = NotificationEvent(
            event_type="job.status_changed",
            channels=(NotificationChannel.IN_APP,),
            recipients={},
            template="job_status_changed",
            payload=IN_APP_PAYLOAD,
        )

        results = await service.send(async_session, event)

        assert results[0].success is False
        assert "No recipient resolved" in results[0].error

    async def test_retries_a_failing_provider_and_eventually_succeeds(self, async_session):
        push = FakeProvider(fail_times=2)
        service = NotificationService(push_provider=push, max_attempts=3)

        event = NotificationEvent(
            event_type="job.status_changed",
            channels=(NotificationChannel.PUSH,),
            recipients={NotificationChannel.PUSH: "topic-1"},
            template="t",
            payload={},
        )

        results = await service.send(async_session, event)

        assert results[0].success is True
        assert len(push.calls) == 3  # 2 failures + 1 success

    async def test_gives_up_after_max_attempts(self, async_session):
        push = FakeProvider(fail_times=99)
        service = NotificationService(push_provider=push, max_attempts=2)

        event = NotificationEvent(
            event_type="job.status_changed",
            channels=(NotificationChannel.PUSH,),
            recipients={NotificationChannel.PUSH: "topic-1"},
            template="t",
            payload={},
        )

        results = await service.send(async_session, event)

        assert results[0].success is False
        assert results[0].error == "simulated failure"
        assert len(push.calls) == 2

    async def test_a_provider_exception_is_captured_as_a_failed_result_not_raised(self, async_session):
        push = FakeProvider(raise_exc=RuntimeError("boom"))
        service = NotificationService(push_provider=push, max_attempts=1)

        event = NotificationEvent(
            event_type="job.status_changed",
            channels=(NotificationChannel.PUSH,),
            recipients={NotificationChannel.PUSH: "topic-1"},
            template="t",
            payload={},
        )

        results = await service.send(async_session, event)

        assert results[0].success is False
        assert results[0].error == "boom"

    async def test_missing_recipient_for_a_channel_fails_only_that_channel(self, async_session):
        push = FakeProvider()
        email = FakeProvider()
        service = NotificationService(push_provider=push, email_provider=email)

        event = NotificationEvent(
            event_type="job.status_changed",
            channels=(NotificationChannel.PUSH, NotificationChannel.EMAIL),
            recipients={NotificationChannel.EMAIL: "jane@example.com"},  # no PUSH recipient
            template="t",
            payload={},
        )

        results = await service.send(async_session, event)

        assert results[0].success is False
        assert "No recipient resolved" in results[0].error
        assert push.calls == []
        assert results[1].success is True
        assert email.calls == [("jane@example.com", "t", {})]


@pytest.mark.unit
class TestNotificationServiceLogging:
    async def test_writes_one_log_row_per_channel_with_status_and_provider(self, async_session):
        push = FakeProvider(name="fake-push")
        email = FakeProvider(name="fake-email", raise_exc=RuntimeError("smtp down"))
        service = NotificationService(push_provider=push, email_provider=email, max_attempts=1)

        event = NotificationEvent(
            event_type="test.logging_event",
            channels=(NotificationChannel.PUSH, NotificationChannel.EMAIL),
            recipients={NotificationChannel.PUSH: "topic-1", NotificationChannel.EMAIL: "jane@example.com"},
            template="t",
            payload={},
        )

        await service.send(async_session, event)

        rows = await _log_rows(async_session, "test.logging_event")
        by_channel = {row.channel: row for row in rows}

        assert by_channel[NotificationChannel.PUSH].status == NotificationLogStatus.SENT
        assert by_channel[NotificationChannel.PUSH].provider == "fake-push"
        assert by_channel[NotificationChannel.PUSH].error is None

        assert by_channel[NotificationChannel.EMAIL].status == NotificationLogStatus.FAILED
        assert by_channel[NotificationChannel.EMAIL].provider == "fake-email"
        assert by_channel[NotificationChannel.EMAIL].error == "smtp down"

    async def test_in_app_delivery_is_also_logged(self, async_session):
        user = await create_test_user(async_session)
        service = NotificationService()

        event = NotificationEvent(
            event_type="test.in_app_logging",
            channels=(NotificationChannel.IN_APP,),
            recipients={NotificationChannel.IN_APP: str(user.id)},
            template="t",
            payload=IN_APP_PAYLOAD,
        )

        await service.send(async_session, event)

        rows = await _log_rows(async_session, "test.in_app_logging")
        assert len(rows) == 1
        assert rows[0].channel == NotificationChannel.IN_APP
        assert rows[0].status == NotificationLogStatus.SENT
        assert rows[0].provider == "in_app"


@pytest.mark.unit
class TestNotificationServiceInAppDelivery:
    async def test_persists_a_notification_row_with_the_bilingual_fields_and_job_link(self, async_session):
        user = await create_test_user(async_session)
        job = await create_test_job(async_session, user)
        service = NotificationService()

        event = NotificationEvent(
            event_type="job.status_changed",
            channels=(NotificationChannel.IN_APP,),
            recipients={NotificationChannel.IN_APP: str(user.id)},
            template="t",
            payload={**IN_APP_PAYLOAD, "related_job_id": job.id},
        )

        await service.send(async_session, event)

        rows = (await async_session.execute(select(Notification).where(Notification.user_id == user.id))).scalars().all()
        assert len(rows) == 1
        assert rows[0].type == "job.status_changed"
        assert rows[0].title_ar == IN_APP_PAYLOAD["title_ar"]
        assert rows[0].title_fr == IN_APP_PAYLOAD["title_fr"]
        assert rows[0].body_ar == IN_APP_PAYLOAD["body_ar"]
        assert rows[0].body_fr == IN_APP_PAYLOAD["body_fr"]
        assert rows[0].related_job_id == job.id
        assert rows[0].read_at is None

    async def test_pushes_the_new_notification_over_an_open_websocket_connection(self, async_session):
        user = await create_test_user(async_session)
        ws = FakeWebSocket()
        await connection_manager.connect(user.id, ws)
        try:
            service = NotificationService()
            event = NotificationEvent(
                event_type="job.status_changed",
                channels=(NotificationChannel.IN_APP,),
                recipients={NotificationChannel.IN_APP: str(user.id)},
                template="t",
                payload=IN_APP_PAYLOAD,
            )

            await service.send(async_session, event)

            assert len(ws.sent) == 1
            assert ws.sent[0]["type"] == "notification"
            assert ws.sent[0]["data"]["title_fr"] == IN_APP_PAYLOAD["title_fr"]
        finally:
            connection_manager.disconnect(user.id, ws)

    async def test_does_not_push_when_the_recipient_has_no_open_connection(self, async_session):
        user = await create_test_user(async_session)
        service = NotificationService()

        event = NotificationEvent(
            event_type="job.status_changed",
            channels=(NotificationChannel.IN_APP,),
            recipients={NotificationChannel.IN_APP: str(user.id)},
            template="t",
            payload=IN_APP_PAYLOAD,
        )

        # No WS connection registered for this user -- should still succeed
        # and persist, just without a push.
        results = await service.send(async_session, event)

        assert results[0].success is True

    async def test_fails_when_a_required_bilingual_field_is_missing(self, async_session):
        user = await create_test_user(async_session)
        service = NotificationService()

        event = NotificationEvent(
            event_type="job.status_changed",
            channels=(NotificationChannel.IN_APP,),
            recipients={NotificationChannel.IN_APP: str(user.id)},
            template="t",
            payload={"title_ar": "عنوان", "title_fr": "Titre", "body_ar": "نص"},  # missing body_fr
        )

        results = await service.send(async_session, event)

        assert results[0].success is False
        assert "body_fr" in results[0].error

    async def test_fails_when_the_recipient_is_not_a_valid_user_id(self, async_session):
        service = NotificationService()

        event = NotificationEvent(
            event_type="job.status_changed",
            channels=(NotificationChannel.IN_APP,),
            recipients={NotificationChannel.IN_APP: "not-an-id"},
            template="t",
            payload=IN_APP_PAYLOAD,
        )

        results = await service.send(async_session, event)

        assert results[0].success is False
        assert "Invalid in-app recipient" in results[0].error


@pytest.mark.unit
class TestNotificationServiceConfigDrivenDefaults:
    async def test_email_channel_defaults_to_the_noop_provider_when_not_overridden(self, async_session):
        """No provider passed in -- resolution falls back to
        NOTIFICATION_EMAIL_PROVIDER (default: noop), never a concrete SDK."""
        service = NotificationService()

        event = NotificationEvent(
            event_type="test.default_provider",
            channels=(NotificationChannel.EMAIL,),
            recipients={NotificationChannel.EMAIL: "jane@example.com"},
            template="t",
            payload={},
        )

        results = await service.send(async_session, event)

        assert results[0] == DeliveryResult(success=True, provider="noop")


@pytest.mark.unit
class TestNotificationServicePreferences:
    """Issue 6: a disabled (channel, event_type) preference must actually
    suppress the send, not just hide a toggle in a UI somewhere."""

    async def test_a_disabled_preference_suppresses_the_send(self, async_session):
        user = await create_test_user(async_session)
        push = FakeProvider(name="fake-push")
        await crud_notification_preferences.set_enabled(
            db=async_session, user_id=user.id, channel=NotificationChannel.PUSH, event_type="job.started", enabled=False
        )
        service = NotificationService(push_provider=push)

        event = NotificationEvent(
            event_type="job.started",
            channels=(NotificationChannel.PUSH,),
            recipients={NotificationChannel.PUSH: str(user.id)},
            template="t",
            payload={},
        )
        results = await service.send(async_session, event)

        assert results[0] == DeliveryResult(success=True, provider="skipped", error="Disabled by user notification preference")
        assert push.calls == []  # the provider was never even called

        logs = await _log_rows(async_session, "job.started")
        assert logs[0].status == NotificationLogStatus.SKIPPED

    async def test_a_disabled_preference_only_suppresses_its_own_channel(self, async_session):
        user = await create_test_user(async_session)
        push = FakeProvider(name="fake-push")
        email = FakeProvider(name="fake-email")
        await crud_notification_preferences.set_enabled(
            db=async_session, user_id=user.id, channel=NotificationChannel.PUSH, event_type="review_received", enabled=False
        )
        service = NotificationService(push_provider=push, email_provider=email)

        event = NotificationEvent(
            event_type="review_received",
            channels=(NotificationChannel.PUSH, NotificationChannel.EMAIL),
            recipients={NotificationChannel.PUSH: str(user.id), NotificationChannel.EMAIL: str(user.id)},
            template="t",
            payload={},
        )
        results = await service.send(async_session, event)

        assert results[0].provider == "skipped"
        assert results[1] == DeliveryResult(success=True, provider="fake-email")
        assert push.calls == []
        assert len(email.calls) == 1

    async def test_no_preference_row_defaults_to_enabled(self, async_session):
        user = await create_test_user(async_session)
        push = FakeProvider(name="fake-push")
        service = NotificationService(push_provider=push)

        event = NotificationEvent(
            event_type="job.started",
            channels=(NotificationChannel.PUSH,),
            recipients={NotificationChannel.PUSH: str(user.id)},
            template="t",
            payload={},
        )
        results = await service.send(async_session, event)

        assert results[0] == DeliveryResult(success=True, provider="fake-push")
        assert len(push.calls) == 1

    async def test_disabling_one_event_type_does_not_affect_another(self, async_session):
        user = await create_test_user(async_session)
        push = FakeProvider(name="fake-push")
        await crud_notification_preferences.set_enabled(
            db=async_session, user_id=user.id, channel=NotificationChannel.PUSH, event_type="job.started", enabled=False
        )
        service = NotificationService(push_provider=push)

        event = NotificationEvent(
            event_type="job.completed",
            channels=(NotificationChannel.PUSH,),
            recipients={NotificationChannel.PUSH: str(user.id)},
            template="t",
            payload={},
        )
        results = await service.send(async_session, event)

        assert results[0].success is True
        assert results[0].provider == "fake-push"

    async def test_re_enabling_a_previously_disabled_preference_resumes_sending(self, async_session):
        user = await create_test_user(async_session)
        push = FakeProvider(name="fake-push")
        await crud_notification_preferences.set_enabled(
            db=async_session, user_id=user.id, channel=NotificationChannel.PUSH, event_type="job.started", enabled=False
        )
        await crud_notification_preferences.set_enabled(
            db=async_session, user_id=user.id, channel=NotificationChannel.PUSH, event_type="job.started", enabled=True
        )
        service = NotificationService(push_provider=push)

        event = NotificationEvent(
            event_type="job.started",
            channels=(NotificationChannel.PUSH,),
            recipients={NotificationChannel.PUSH: str(user.id)},
            template="t",
            payload={},
        )
        results = await service.send(async_session, event)

        assert results[0].provider == "fake-push"
        assert len(push.calls) == 1

    async def test_sms_is_never_suppressible_even_with_a_matching_row(self, async_session):
        """SMS OTP is a mandatory auth requirement (Issue 5), not a
        preference -- NotificationService must ignore any notification_preferences
        row on the SMS channel rather than honor it."""
        user = await create_test_user(async_session)
        sms = FakeProvider(name="fake-sms")
        await crud_notification_preferences.set_enabled(
            db=async_session, user_id=user.id, channel=NotificationChannel.SMS, event_type="otp_code", enabled=False
        )
        service = NotificationService(sms_provider=sms)

        event = NotificationEvent(
            event_type="otp_code",
            channels=(NotificationChannel.SMS,),
            recipients={NotificationChannel.SMS: str(user.id)},
            template="t",
            payload={},
        )
        results = await service.send(async_session, event)

        assert results[0].provider == "fake-sms"
        assert len(sms.calls) == 1

    async def test_in_app_is_never_suppressible_even_with_a_matching_row(self, async_session):
        user = await create_test_user(async_session)
        await crud_notification_preferences.set_enabled(
            db=async_session, user_id=user.id, channel=NotificationChannel.IN_APP, event_type="job.started", enabled=False
        )
        service = NotificationService()

        event = NotificationEvent(
            event_type="job.started",
            channels=(NotificationChannel.IN_APP,),
            recipients={NotificationChannel.IN_APP: str(user.id)},
            template="t",
            payload=IN_APP_PAYLOAD,
        )
        results = await service.send(async_session, event)

        assert results[0].success is True
        assert results[0].provider == "in_app"
