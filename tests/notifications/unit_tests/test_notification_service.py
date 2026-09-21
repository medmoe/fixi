from typing import Any

import pytest
from sqlalchemy import select

from src.app.models import NotificationChannel, NotificationLog, NotificationLogStatus
from src.app.services.notifications import DeliveryResult, NotificationEvent, NotificationProvider, NotificationService


class FakeProvider(NotificationProvider):
    """Records every call; can be told to fail N times before succeeding,
    or to always raise -- so retry/error paths are exercised without
    touching a real SDK."""

    def __init__(self, name: str = "fake", fail_times: int = 0, raise_exc: Exception | None = None) -> None:
        self.name = name
        self.calls: list[tuple[str, str, dict[str, Any]]] = []
        self._fail_times = fail_times
        self._raise_exc = raise_exc

    async def send(self, recipient: str, template: str, payload: dict[str, Any]) -> DeliveryResult:
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

    async def test_in_app_channel_succeeds_without_a_provider(self, async_session):
        """Persisted in-app delivery lands in a later Phase 6 issue -- for
        now this abstraction layer just needs to route + log it as sent."""
        service = NotificationService()

        event = NotificationEvent(
            event_type="job.status_changed",
            channels=(NotificationChannel.IN_APP,),
            recipients={NotificationChannel.IN_APP: "42"},
            template="job_status_changed",
            payload={},
        )

        results = await service.send(async_session, event)

        assert results == [DeliveryResult(success=True, provider="in_app")]

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
        service = NotificationService()

        event = NotificationEvent(
            event_type="test.in_app_logging",
            channels=(NotificationChannel.IN_APP,),
            recipients={NotificationChannel.IN_APP: "42"},
            template="t",
            payload={},
        )

        await service.send(async_session, event)

        rows = await _log_rows(async_session, "test.in_app_logging")
        assert len(rows) == 1
        assert rows[0].channel == NotificationChannel.IN_APP
        assert rows[0].status == NotificationLogStatus.SENT
        assert rows[0].provider == "in_app"


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
