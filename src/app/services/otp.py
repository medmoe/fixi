from __future__ import annotations

import hashlib
import secrets
import time

from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.exceptions.http_exceptions import CustomException, RateLimitException
from ..core.logger import logging
from ..core.utils.rate_limit import rate_limiter
from ..crud.crud_notification_logs import crud_notification_logs
from ..models import NotificationChannel, NotificationLogStatus
from ..schemas.notification_log import NotificationLogCreateInternal
from .notifications.providers import SmsProvider

logger = logging.getLogger(__name__)

_CODE_KEY = "otp:code:{phone}"
_ATTEMPTS_KEY = "otp:attempts:{phone}"
_COOLDOWN_KEY = "otp:cooldown:{phone}"
_WINDOW_KEY = "otp:window:{phone}:{window}"


def _hash_code(phone_number: str, code: str) -> str:
    # Salted with the phone number so two numbers issued the same 6-digit
    # code (1-in-a-million but not impossible) don't collide in Redis.
    return hashlib.sha256(f"{phone_number}:{code}".encode()).hexdigest()


def _generate_code(length: int) -> str:
    return "".join(secrets.choice("0123456789") for _ in range(length))


class OtpService:
    """Generates, stores, rate-limits, and verifies phone OTPs (Issue 5).

    Deliberately bypasses NotificationService's user_id-keyed event
    pipeline: OTP targets a raw phone number before/without an
    authenticated User row existing, so there's nothing for that pipeline
    to resolve a recipient from. It still writes to notification_logs
    directly (same table, event_type="otp_code") so SMS delivery failures
    show up next to every other channel's audit trail.

    Storage is Redis only, via the same client `rate_limiter` already
    holds open -- codes are short-lived and disposable, a DB table would
    just be write-heavy churn for no benefit. No SIM/gateway is
    provisioned yet (see documentation/SMS_GATEWAY_RUNBOOK.md); until then
    NOTIFICATION_SMS_PROVIDER=noop makes `send()` log-only and `verify()`
    behaves identically either way, so this whole path is exercisable now.
    """

    def __init__(self, sms_provider: SmsProvider | None = None) -> None:
        self._sms_provider = sms_provider

    def _provider(self) -> SmsProvider:
        # Resolved fresh from config on every call (never cached on self)
        # unless a provider was injected at construction -- `otp_service`
        # below is a long-lived module-level singleton, not built fresh
        # per-request like NotificationService is, so caching here would
        # mean NOTIFICATION_SMS_PROVIDER could only ever take effect for
        # whichever provider resolved first after process start.
        if self._sms_provider is not None:
            return self._sms_provider
        from .notifications.service import _resolve_sms_provider

        return _resolve_sms_provider()

    async def send(self, db: AsyncSession, phone_number: str) -> None:
        """Generates and sends a new OTP to `phone_number`.

        Raises RateLimitException if this number is sending too fast/too
        often, or CustomException(503) if the SMS gateway itself is
        unreachable/unconfigured. Callers must not swallow either into a
        bare success response -- Issue 5's acceptance criteria explicitly
        call for "a clear user-facing error, not a silent hang" when the
        gateway is down.
        """
        client = rate_limiter.get_client()

        cooldown_key = _COOLDOWN_KEY.format(phone=phone_number)
        if await client.exists(cooldown_key):
            ttl = await client.ttl(cooldown_key)
            raise RateLimitException(f"Please wait {max(ttl, 1)}s before requesting another code")

        window = int(time.time()) // settings.OTP_SEND_WINDOW_SECONDS
        window_key = _WINDOW_KEY.format(phone=phone_number, window=window)
        sends_in_window = await client.incr(window_key)
        if sends_in_window == 1:
            await client.expire(window_key, settings.OTP_SEND_WINDOW_SECONDS)
        if sends_in_window > settings.OTP_MAX_SENDS_PER_WINDOW:
            raise RateLimitException("Too many OTP requests for this phone number -- try again later")

        code = _generate_code(settings.OTP_LENGTH)
        code_key = _CODE_KEY.format(phone=phone_number)
        attempts_key = _ATTEMPTS_KEY.format(phone=phone_number)
        await client.set(code_key, _hash_code(phone_number, code), ex=settings.OTP_TTL_SECONDS)
        await client.delete(attempts_key)  # a fresh code resets the wrong-guess counter
        await client.set(cooldown_key, "1", ex=settings.OTP_SEND_COOLDOWN_SECONDS)

        ttl_minutes = settings.OTP_TTL_SECONDS // 60
        result = await self._provider().send(db, phone_number, "otp_code", {"code": code, "ttl_minutes": ttl_minutes})
        await self._log(db, provider=result.provider, success=result.success, error=result.error)

        if not result.success:
            # The code stays in Redis on failure -- a caller retrying
            # /send right after fixing the gateway should still spend the
            # cooldown/window counters already used, not reset the clock
            # for someone hammering /send during an outage.
            logger.warning("OTP send failed", extra={"provider": result.provider, "error": result.error})
            raise CustomException(status_code=503, detail=f"SMS gateway unavailable: {result.error}")

    async def verify(self, phone_number: str, code: str) -> bool:
        """Returns True iff `code` is the current, unexpired, unburned OTP
        for `phone_number`. Burns the code on a correct guess (single use)
        and on exceeding OTP_MAX_VERIFY_ATTEMPTS (stops a 6-digit code
        being brute-forceable within its own TTL)."""
        client = rate_limiter.get_client()
        code_key = _CODE_KEY.format(phone=phone_number)
        attempts_key = _ATTEMPTS_KEY.format(phone=phone_number)

        stored_hash = await client.get(code_key)
        if stored_hash is None:
            return False
        if isinstance(stored_hash, bytes):
            stored_hash = stored_hash.decode()

        attempts = await client.incr(attempts_key)
        if attempts == 1:
            code_ttl = await client.ttl(code_key)
            await client.expire(attempts_key, max(code_ttl, 1))
        if attempts > settings.OTP_MAX_VERIFY_ATTEMPTS:
            await client.delete(code_key)
            return False

        if stored_hash != _hash_code(phone_number, code):
            return False

        await client.delete(code_key)
        await client.delete(attempts_key)
        return True

    async def _log(self, db: AsyncSession, *, provider: str, success: bool, error: str | None) -> None:
        await crud_notification_logs.create(
            db=db,
            object=NotificationLogCreateInternal(
                event_type="otp_code",
                channel=NotificationChannel.SMS,
                provider=provider,
                status=NotificationLogStatus.SENT if success else NotificationLogStatus.FAILED,
                error=error,
            ),
        )


otp_service = OtpService()
