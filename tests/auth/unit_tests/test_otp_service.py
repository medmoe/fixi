import pytest
import pytest_asyncio
from sqlalchemy import select

from src.app.core.exceptions.http_exceptions import CustomException, RateLimitException
from src.app.core.utils.rate_limit import RateLimiter
from src.app.models import NotificationLog
from src.app.services.notifications.providers import DeliveryResult, SmsProvider
from src.app.services.otp import _COOLDOWN_KEY, OtpService
from tests.conftest import REDIS_URI

PHONE = "+213555000000"


class FakeSmsProvider(SmsProvider):
    name = "fake"

    def __init__(self, *, success: bool = True, error: str | None = None) -> None:
        self.success = success
        self.error = error
        self.sent: list[tuple[str, str, dict]] = []

    async def send(self, db, recipient, template, payload):
        self.sent.append((recipient, template, payload))
        return DeliveryResult(success=self.success, provider=self.name, error=self.error)


@pytest_asyncio.fixture
async def redis_client():
    """A real Redis client, flushed before/after -- OtpService talks to
    Redis directly (via the shared `rate_limiter` singleton), so there's
    nothing meaningful to unit test against a mock here."""
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


@pytest.mark.unit
class TestOtpServiceSend:
    async def test_send_stores_a_verifiable_code(self, async_session, redis_client):
        provider = FakeSmsProvider()
        service = OtpService(sms_provider=provider)

        await service.send(async_session, PHONE)

        assert len(provider.sent) == 1
        recipient, template, payload = provider.sent[0]
        assert recipient == PHONE
        assert template == "otp_code"
        code = payload["code"]
        assert len(code) == 6
        assert code.isdigit()

        assert await service.verify(PHONE, code) is True

    async def test_send_logs_the_delivery_attempt(self, async_session, redis_client):
        provider = FakeSmsProvider()
        service = OtpService(sms_provider=provider)

        await service.send(async_session, PHONE)

        logs = (await async_session.execute(select(NotificationLog).where(NotificationLog.event_type == "otp_code"))).scalars().all()
        assert len(logs) == 1
        assert logs[0].provider == "fake"
        assert logs[0].status.value == "sent"

    async def test_resending_before_cooldown_expires_is_rate_limited(self, async_session, redis_client):
        service = OtpService(sms_provider=FakeSmsProvider())
        await service.send(async_session, PHONE)

        with pytest.raises(RateLimitException):
            await service.send(async_session, PHONE)

    async def test_exceeding_the_send_window_is_rate_limited(self, async_session, redis_client, monkeypatch):
        monkeypatch.setattr("src.app.services.otp.settings.OTP_MAX_SENDS_PER_WINDOW", 2)
        service = OtpService(sms_provider=FakeSmsProvider())
        cooldown_key = _COOLDOWN_KEY.format(phone=PHONE)

        await service.send(async_session, PHONE)
        await redis_client.delete(cooldown_key)  # simulate the cooldown having passed
        await service.send(async_session, PHONE)
        await redis_client.delete(cooldown_key)

        with pytest.raises(RateLimitException):
            await service.send(async_session, PHONE)

    async def test_gateway_failure_surfaces_as_a_clear_error_not_a_silent_success(self, async_session, redis_client):
        provider = FakeSmsProvider(success=False, error="gateway unreachable")
        service = OtpService(sms_provider=provider)

        with pytest.raises(CustomException) as exc_info:
            await service.send(async_session, PHONE)

        assert exc_info.value.status_code == 503
        assert "gateway unreachable" in exc_info.value.detail

    async def test_gateway_failure_still_logs_a_failed_attempt(self, async_session, redis_client):
        provider = FakeSmsProvider(success=False, error="gateway unreachable")
        service = OtpService(sms_provider=provider)

        with pytest.raises(CustomException):
            await service.send(async_session, PHONE)

        logs = (await async_session.execute(select(NotificationLog).where(NotificationLog.event_type == "otp_code"))).scalars().all()
        assert len(logs) == 1
        assert logs[0].status.value == "failed"


@pytest.mark.unit
class TestOtpServiceVerify:
    async def test_verifying_an_unsent_number_returns_false(self, redis_client):
        service = OtpService(sms_provider=FakeSmsProvider())
        assert await service.verify(PHONE, "123456") is False

    async def test_wrong_code_does_not_verify(self, async_session, redis_client):
        service = OtpService(sms_provider=FakeSmsProvider())
        await service.send(async_session, PHONE)

        assert await service.verify(PHONE, "000000") is False

    async def test_code_is_single_use(self, async_session, redis_client):
        provider = FakeSmsProvider()
        service = OtpService(sms_provider=provider)
        await service.send(async_session, PHONE)
        code = provider.sent[0][2]["code"]

        assert await service.verify(PHONE, code) is True
        assert await service.verify(PHONE, code) is False

    async def test_too_many_wrong_guesses_burns_the_code(self, async_session, redis_client, monkeypatch):
        monkeypatch.setattr("src.app.services.otp.settings.OTP_MAX_VERIFY_ATTEMPTS", 2)
        provider = FakeSmsProvider()
        service = OtpService(sms_provider=provider)
        await service.send(async_session, PHONE)
        code = provider.sent[0][2]["code"]

        assert await service.verify(PHONE, "000000") is False
        assert await service.verify(PHONE, "000001") is False
        # third attempt is rejected outright, even with the correct code --
        # the code was burned by exceeding OTP_MAX_VERIFY_ATTEMPTS
        assert await service.verify(PHONE, code) is False
