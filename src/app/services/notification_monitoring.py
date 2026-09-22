from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.logger import logging
from ..core.utils.rate_limit import rate_limiter
from ..models import NotificationChannel, NotificationLog, NotificationLogStatus
from .alerting import resolve_admin_alert_provider

logger = logging.getLogger(__name__)

# SMS only ever carries OTP today (see services/otp.py) -- named explicitly
# rather than inferred from settings, since alerting on "all SMS" and
# alerting on "the auth-blocking OTP path" happen to be the same query only
# because nothing else uses SMS yet.
OTP_EVENT_TYPE = "otp_code"

_OTP_ALERT_COOLDOWN_KEY = "otp_alert:cooldown"


@dataclass(frozen=True, slots=True)
class ChannelProviderFailureRate:
    """One (channel, provider) pair's delivery outcomes within a window.
    `skipped` (Issue 6: suppressed by a user's notification preference) is
    reported separately and deliberately excluded from `failure_rate` --
    it was never attempted, so it's not a delivery failure."""

    channel: NotificationChannel
    provider: str
    sent: int
    failed: int
    skipped: int

    @property
    def attempted(self) -> int:
        return self.sent + self.failed

    @property
    def failure_rate(self) -> float | None:
        return None if self.attempted == 0 else self.failed / self.attempted


async def get_failure_rates(db: AsyncSession, *, since: datetime, event_type: str | None = None) -> list[ChannelProviderFailureRate]:
    """Failure rate by (channel, provider) over notification_logs rows
    created at/after `since`, optionally scoped to one event_type. This is
    Issue 7's "queryable without a DB console session" requirement --
    exposed over the API by GET /notifications/stats."""
    query = (
        select(NotificationLog.channel, NotificationLog.provider, NotificationLog.status, func.count().label("count"))
        .where(NotificationLog.created_at >= since)
        .group_by(NotificationLog.channel, NotificationLog.provider, NotificationLog.status)
    )
    if event_type is not None:
        query = query.where(NotificationLog.event_type == event_type)

    rows = (await db.execute(query)).all()

    counts: dict[tuple[NotificationChannel, str], dict[NotificationLogStatus, int]] = {}
    for channel, provider, status, count in rows:
        counts.setdefault((channel, provider), {})[status] = count

    return [
        ChannelProviderFailureRate(
            channel=channel,
            provider=provider,
            sent=status_counts.get(NotificationLogStatus.SENT, 0),
            failed=status_counts.get(NotificationLogStatus.FAILED, 0),
            skipped=status_counts.get(NotificationLogStatus.SKIPPED, 0),
        )
        for (channel, provider), status_counts in counts.items()
    ]


@dataclass(frozen=True, slots=True)
class OtpAlertCheckResult:
    sample_size: int
    failure_rate: float | None
    threshold: float
    triggered: bool
    alert_sent: bool = False
    alert_error: str | None = None
    suppressed_by_cooldown: bool = False


async def check_sms_otp_failure_rate_and_alert(db: AsyncSession) -> OtpAlertCheckResult:
    """Entry point for the cron job (every OTP_ALERT_WINDOW_MINUTES-ish
    minutes, see WorkerSettings.cron_jobs). Computes the SMS/otp_code
    failure rate over the trailing window and, if it crosses
    OTP_ALERT_FAILURE_RATE_THRESHOLD on at least OTP_ALERT_MIN_SAMPLE_SIZE
    attempts, pages the admin alert provider -- at most once per
    OTP_ALERT_COOLDOWN_MINUTES so an ongoing outage doesn't re-page on
    every tick."""
    since = datetime.now(UTC) - timedelta(minutes=settings.OTP_ALERT_WINDOW_MINUTES)
    rates = await get_failure_rates(db, since=since, event_type=OTP_EVENT_TYPE)
    sms_rates = [rate for rate in rates if rate.channel == NotificationChannel.SMS]

    sample_size = sum(rate.attempted for rate in sms_rates)
    failed = sum(rate.failed for rate in sms_rates)
    threshold = settings.OTP_ALERT_FAILURE_RATE_THRESHOLD

    if sample_size < settings.OTP_ALERT_MIN_SAMPLE_SIZE:
        return OtpAlertCheckResult(sample_size=sample_size, failure_rate=None, threshold=threshold, triggered=False)

    failure_rate = failed / sample_size
    if failure_rate < threshold:
        return OtpAlertCheckResult(sample_size=sample_size, failure_rate=failure_rate, threshold=threshold, triggered=False)

    client = rate_limiter.get_client()
    if await client.exists(_OTP_ALERT_COOLDOWN_KEY):
        return OtpAlertCheckResult(
            sample_size=sample_size, failure_rate=failure_rate, threshold=threshold, triggered=True, suppressed_by_cooldown=True
        )

    message = (
        f"[Fixi] SMS OTP failure rate is {failure_rate:.0%} over the last {settings.OTP_ALERT_WINDOW_MINUTES} minute(s) "
        f"({failed}/{sample_size} failed) -- above the {threshold:.0%} alert threshold. OTP blocks login."
    )
    logger.warning("SMS OTP failure rate spike: %s", message)

    result = await resolve_admin_alert_provider().send(message)
    if result.success:
        await client.set(_OTP_ALERT_COOLDOWN_KEY, "1", ex=settings.OTP_ALERT_COOLDOWN_MINUTES * 60)

    return OtpAlertCheckResult(
        sample_size=sample_size,
        failure_rate=failure_rate,
        threshold=threshold,
        triggered=True,
        alert_sent=result.success,
        alert_error=result.error,
    )
