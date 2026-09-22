from datetime import UTC, datetime, timedelta

import pytest
import pytest_asyncio

from src.app.core.utils.rate_limit import RateLimiter
from src.app.models import NotificationChannel, NotificationLog, NotificationLogStatus
from src.app.services.notification_monitoring import (
    _OTP_ALERT_COOLDOWN_KEY,
    OTP_EVENT_TYPE,
    check_sms_otp_failure_rate_and_alert,
    get_failure_rates,
)
from src.app.services.notifications.providers import DeliveryResult
from tests.conftest import REDIS_URI


async def _create_log(async_session, **overrides) -> NotificationLog:
    defaults = {
        "event_type": OTP_EVENT_TYPE,
        "channel": NotificationChannel.SMS,
        "provider": "capcom6",
        "status": NotificationLogStatus.SENT,
        "error": None,
    }
    defaults.update(overrides)
    log = NotificationLog(**defaults)
    async_session.add(log)
    await async_session.commit()
    await async_session.refresh(log)
    return log


@pytest_asyncio.fixture
async def redis_client():
    RateLimiter._instance = None
    RateLimiter.pool = None
    RateLimiter.client = None
    RateLimiter.initialize(REDIS_URI)
    client = RateLimiter.get_client()
    await client.flushdb()
    yield client

    if RateLimiter.pool is not None:
        await RateLimiter.pool.aclose()
    RateLimiter._instance = None
    RateLimiter.pool = None
    RateLimiter.client = None


class FakeAlertProvider:
    name = "fake"

    def __init__(self, *, success: bool = True, error: str | None = None) -> None:
        self.success = success
        self.error = error
        self.messages: list[str] = []

    async def send(self, message: str) -> DeliveryResult:
        self.messages.append(message)
        return DeliveryResult(success=self.success, provider=self.name, error=self.error)


@pytest.mark.unit
class TestGetFailureRates:
    async def test_groups_by_channel_and_provider(self, async_session):
        await _create_log(async_session, channel=NotificationChannel.SMS, provider="capcom6", status=NotificationLogStatus.SENT)
        await _create_log(async_session, channel=NotificationChannel.SMS, provider="capcom6", status=NotificationLogStatus.FAILED)
        await _create_log(async_session, channel=NotificationChannel.EMAIL, provider="mailjet", status=NotificationLogStatus.SENT)

        rates = await get_failure_rates(async_session, since=datetime.now(UTC) - timedelta(hours=1))

        by_key = {(r.channel, r.provider): r for r in rates}
        sms = by_key[(NotificationChannel.SMS, "capcom6")]
        assert sms.sent == 1
        assert sms.failed == 1
        assert sms.failure_rate == 0.5

        email = by_key[(NotificationChannel.EMAIL, "mailjet")]
        assert email.sent == 1
        assert email.failed == 0
        assert email.failure_rate == 0.0

    async def test_skipped_is_excluded_from_failure_rate(self, async_session):
        await _create_log(async_session, status=NotificationLogStatus.SENT)
        await _create_log(async_session, status=NotificationLogStatus.SKIPPED)
        await _create_log(async_session, status=NotificationLogStatus.SKIPPED)

        rates = await get_failure_rates(async_session, since=datetime.now(UTC) - timedelta(hours=1))

        rate = next(r for r in rates if r.channel == NotificationChannel.SMS)
        assert rate.skipped == 2
        assert rate.attempted == 1  # skipped rows don't count as "attempted"
        assert rate.failure_rate == 0.0

    async def test_failure_rate_is_none_when_nothing_was_attempted(self, async_session):
        await _create_log(async_session, status=NotificationLogStatus.SKIPPED)

        rates = await get_failure_rates(async_session, since=datetime.now(UTC) - timedelta(hours=1))

        rate = next(r for r in rates if r.channel == NotificationChannel.SMS)
        assert rate.attempted == 0
        assert rate.failure_rate is None

    async def test_excludes_rows_before_the_since_cutoff(self, async_session):
        old = await _create_log(async_session, status=NotificationLogStatus.FAILED)
        old.created_at = datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=5)
        await async_session.commit()
        await _create_log(async_session, status=NotificationLogStatus.SENT)

        rates = await get_failure_rates(async_session, since=datetime.now(UTC) - timedelta(hours=1))

        rate = next(r for r in rates if r.channel == NotificationChannel.SMS)
        assert rate.sent == 1
        assert rate.failed == 0

    async def test_filters_by_event_type(self, async_session):
        await _create_log(async_session, event_type="otp_code", status=NotificationLogStatus.FAILED)
        await _create_log(async_session, event_type="review_received", channel=NotificationChannel.EMAIL, provider="mailjet", status=NotificationLogStatus.FAILED)

        rates = await get_failure_rates(async_session, since=datetime.now(UTC) - timedelta(hours=1), event_type="otp_code")

        assert len(rates) == 1
        assert rates[0].channel == NotificationChannel.SMS


@pytest.mark.unit
class TestCheckSmsOtpFailureRateAndAlert:
    async def test_below_minimum_sample_size_does_not_trigger(self, async_session, redis_client, monkeypatch):
        monkeypatch.setattr("src.app.services.notification_monitoring.settings.OTP_ALERT_MIN_SAMPLE_SIZE", 5)
        for _ in range(2):
            await _create_log(async_session, status=NotificationLogStatus.FAILED)

        result = await check_sms_otp_failure_rate_and_alert(async_session)

        assert result.triggered is False
        assert result.failure_rate is None
        assert result.sample_size == 2

    async def test_below_threshold_does_not_trigger(self, async_session, redis_client, monkeypatch):
        monkeypatch.setattr("src.app.services.notification_monitoring.settings.OTP_ALERT_MIN_SAMPLE_SIZE", 2)
        monkeypatch.setattr("src.app.services.notification_monitoring.settings.OTP_ALERT_FAILURE_RATE_THRESHOLD", 0.5)
        await _create_log(async_session, status=NotificationLogStatus.SENT)
        await _create_log(async_session, status=NotificationLogStatus.SENT)
        await _create_log(async_session, status=NotificationLogStatus.FAILED)

        result = await check_sms_otp_failure_rate_and_alert(async_session)

        assert result.triggered is False
        assert result.failure_rate == pytest.approx(1 / 3)

    async def test_above_threshold_triggers_and_sends_an_alert(self, async_session, redis_client, monkeypatch):
        fake_provider = FakeAlertProvider()
        monkeypatch.setattr("src.app.services.notification_monitoring.resolve_admin_alert_provider", lambda: fake_provider)
        monkeypatch.setattr("src.app.services.notification_monitoring.settings.OTP_ALERT_MIN_SAMPLE_SIZE", 2)
        monkeypatch.setattr("src.app.services.notification_monitoring.settings.OTP_ALERT_FAILURE_RATE_THRESHOLD", 0.3)
        await _create_log(async_session, status=NotificationLogStatus.SENT)
        await _create_log(async_session, status=NotificationLogStatus.FAILED)
        await _create_log(async_session, status=NotificationLogStatus.FAILED)

        result = await check_sms_otp_failure_rate_and_alert(async_session)

        assert result.triggered is True
        assert result.alert_sent is True
        assert result.suppressed_by_cooldown is False
        assert len(fake_provider.messages) == 1
        assert "otp" in fake_provider.messages[0].lower() or "OTP" in fake_provider.messages[0]

    async def test_a_second_spike_within_the_cooldown_window_is_suppressed(self, async_session, redis_client, monkeypatch):
        fake_provider = FakeAlertProvider()
        monkeypatch.setattr("src.app.services.notification_monitoring.resolve_admin_alert_provider", lambda: fake_provider)
        monkeypatch.setattr("src.app.services.notification_monitoring.settings.OTP_ALERT_MIN_SAMPLE_SIZE", 2)
        monkeypatch.setattr("src.app.services.notification_monitoring.settings.OTP_ALERT_FAILURE_RATE_THRESHOLD", 0.3)
        await _create_log(async_session, status=NotificationLogStatus.FAILED)
        await _create_log(async_session, status=NotificationLogStatus.FAILED)

        first = await check_sms_otp_failure_rate_and_alert(async_session)
        second = await check_sms_otp_failure_rate_and_alert(async_session)

        assert first.alert_sent is True
        assert second.triggered is True
        assert second.suppressed_by_cooldown is True
        assert len(fake_provider.messages) == 1  # not paged twice

    async def test_a_failed_alert_send_does_not_set_the_cooldown(self, async_session, redis_client, monkeypatch):
        fake_provider = FakeAlertProvider(success=False, error="webhook down")
        monkeypatch.setattr("src.app.services.notification_monitoring.resolve_admin_alert_provider", lambda: fake_provider)
        monkeypatch.setattr("src.app.services.notification_monitoring.settings.OTP_ALERT_MIN_SAMPLE_SIZE", 2)
        monkeypatch.setattr("src.app.services.notification_monitoring.settings.OTP_ALERT_FAILURE_RATE_THRESHOLD", 0.3)
        await _create_log(async_session, status=NotificationLogStatus.FAILED)
        await _create_log(async_session, status=NotificationLogStatus.FAILED)

        result = await check_sms_otp_failure_rate_and_alert(async_session)

        assert result.alert_sent is False
        assert result.alert_error == "webhook down"
        assert await redis_client.exists(_OTP_ALERT_COOLDOWN_KEY) == 0

    async def test_ignores_non_sms_channels_and_non_otp_event_types(self, async_session, redis_client, monkeypatch):
        monkeypatch.setattr("src.app.services.notification_monitoring.settings.OTP_ALERT_MIN_SAMPLE_SIZE", 1)
        await _create_log(async_session, channel=NotificationChannel.EMAIL, provider="mailjet", status=NotificationLogStatus.FAILED)
        await _create_log(async_session, event_type="review_received", status=NotificationLogStatus.FAILED)

        result = await check_sms_otp_failure_rate_and_alert(async_session)

        assert result.sample_size == 0
        assert result.triggered is False
