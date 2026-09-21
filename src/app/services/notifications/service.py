from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import settings
from ...core.logger import logging
from ...crud.crud_notification_logs import crud_notification_logs
from ...crud.crud_notifications import crud_notifications
from ...models import NotificationChannel, NotificationLogStatus
from ...schemas.notification import NotificationCreateInternal, NotificationRead
from ...schemas.notification_log import NotificationLogCreateInternal
from .providers import (
    DeliveryResult,
    EmailProvider,
    NoOpEmailProvider,
    NoOpPushProvider,
    NoOpSmsProvider,
    NotificationProvider,
    PushProvider,
    SmsProvider,
)
from .ws_manager import connection_manager

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class NotificationEvent:
    """One notification to dispatch across one or more channels.

    `recipients` maps each channel in `channels` to the channel-specific
    identifier a provider needs (email address, phone number, FCM topic --
    resolving *what* identifies a user on a given channel is the caller's
    job, not this service's). A channel missing from `recipients` fails
    for that channel only; the rest of `channels` still get attempted.
    """

    event_type: str
    channels: tuple[NotificationChannel, ...]
    recipients: dict[NotificationChannel, str]
    template: str
    payload: dict[str, Any] = field(default_factory=dict)


def _resolve_email_provider() -> EmailProvider:
    name = settings.NOTIFICATION_EMAIL_PROVIDER
    if name == "noop":
        return NoOpEmailProvider()
    raise ValueError(f"Unknown email provider: {name!r}")


def _resolve_push_provider() -> PushProvider:
    name = settings.NOTIFICATION_PUSH_PROVIDER
    if name == "fcm":
        from .providers import FcmPushProvider

        return FcmPushProvider()
    if name == "noop":
        return NoOpPushProvider()
    raise ValueError(f"Unknown push provider: {name!r}")


def _resolve_sms_provider() -> SmsProvider:
    name = settings.NOTIFICATION_SMS_PROVIDER
    if name == "noop":
        return NoOpSmsProvider()
    raise ValueError(f"Unknown SMS provider: {name!r}")


_PROVIDER_RESOLVERS = {
    NotificationChannel.EMAIL: _resolve_email_provider,
    NotificationChannel.PUSH: _resolve_push_provider,
    NotificationChannel.SMS: _resolve_sms_provider,
}


class NotificationService:
    """Central seam every Phase 6 notification goes through.

    Resolves an event's channels to providers -- config-driven via the
    `NOTIFICATION_*_PROVIDER` settings, never a hardcoded import -- sends
    with retry, and logs every attempt to `notification_logs`. Callers
    build a `NotificationEvent` and hand it to `send()`; they never import
    a concrete provider (Mailjet SDK, FCM SDK, etc.) directly.
    """

    def __init__(
        self,
        *,
        email_provider: EmailProvider | None = None,
        push_provider: PushProvider | None = None,
        sms_provider: SmsProvider | None = None,
        max_attempts: int = 3,
    ) -> None:
        # Only channels explicitly overridden (e.g. a fake provider in tests)
        # are resolved eagerly -- everything else resolves lazily from config
        # the first time that channel is actually used, so a service instance
        # never needs every provider configured just to send push.
        self._providers: dict[NotificationChannel, NotificationProvider] = {}
        if email_provider is not None:
            self._providers[NotificationChannel.EMAIL] = email_provider
        if push_provider is not None:
            self._providers[NotificationChannel.PUSH] = push_provider
        if sms_provider is not None:
            self._providers[NotificationChannel.SMS] = sms_provider

        self._max_attempts = max_attempts

    def _get_provider(self, channel: NotificationChannel) -> NotificationProvider | None:
        if channel not in self._providers:
            resolver = _PROVIDER_RESOLVERS.get(channel)
            if resolver is None:
                return None
            self._providers[channel] = resolver()
        return self._providers[channel]

    async def send(self, db: AsyncSession, event: NotificationEvent) -> list[DeliveryResult]:
        results = []
        for channel in event.channels:
            result = await self._send_one(db, channel, event)
            results.append(result)
            await self._log(db, event, channel, result)
        return results

    async def _send_one(self, db: AsyncSession, channel: NotificationChannel, event: NotificationEvent) -> DeliveryResult:
        if channel == NotificationChannel.IN_APP:
            return await self._send_in_app(db, event)

        provider = self._get_provider(channel)
        if provider is None:
            return DeliveryResult(success=False, provider="none", error=f"No provider configured for channel {channel.value}")

        recipient = event.recipients.get(channel)
        if recipient is None:
            return DeliveryResult(success=False, provider=provider.name, error=f"No recipient resolved for channel {channel.value}")

        return await self._send_with_retry(provider, recipient, event.template, event.payload)

    async def _send_in_app(self, db: AsyncSession, event: NotificationEvent) -> DeliveryResult:
        """Persists the notification (so it shows up in GET /notifications and
        survives a refresh) and pushes it over the live WS connection, if the
        recipient has one open, for the sub-second update the bell needs."""
        recipient = event.recipients.get(NotificationChannel.IN_APP)
        if recipient is None:
            return DeliveryResult(success=False, provider="in_app", error="No recipient resolved for channel in_app")

        try:
            user_id = int(recipient)
        except (TypeError, ValueError):
            return DeliveryResult(success=False, provider="in_app", error=f"Invalid in-app recipient: {recipient!r}")

        required_fields = ("title_ar", "title_fr", "body_ar", "body_fr")
        missing = [key for key in required_fields if not event.payload.get(key)]
        if missing:
            return DeliveryResult(success=False, provider="in_app", error=f"Missing in-app payload field(s): {', '.join(missing)}")

        notification = await crud_notifications.create(
            db=db,
            object=NotificationCreateInternal(
                user_id=user_id,
                type=event.event_type,
                title_ar=event.payload["title_ar"],
                title_fr=event.payload["title_fr"],
                body_ar=event.payload["body_ar"],
                body_fr=event.payload["body_fr"],
                related_job_id=event.payload.get("related_job_id"),
            ),
            schema_to_select=NotificationRead,
            return_as_model=True,
        )

        await connection_manager.send_to_user(
            user_id,
            {"type": "notification", "data": notification.model_dump(mode="json")},
        )

        return DeliveryResult(success=True, provider="in_app")

    async def _send_with_retry(
        self, provider: NotificationProvider, recipient: str, template: str, payload: dict[str, Any]
    ) -> DeliveryResult:
        result = DeliveryResult(success=False, provider=provider.name, error="not attempted")
        for attempt in range(1, self._max_attempts + 1):
            try:
                result = await provider.send(recipient, template, payload)
            except Exception as exc:  # a provider bug shouldn't crash the caller
                result = DeliveryResult(success=False, provider=provider.name, error=str(exc))

            if result.success:
                return result

            logger.warning(
                "notification send attempt failed",
                extra={
                    "provider": provider.name,
                    "attempt": attempt,
                    "max_attempts": self._max_attempts,
                    "error": result.error,
                },
            )
        return result

    async def _log(self, db: AsyncSession, event: NotificationEvent, channel: NotificationChannel, result: DeliveryResult) -> None:
        logger.info(
            "notification dispatched",
            extra={
                "event_type": event.event_type,
                "channel": channel.value,
                "provider": result.provider,
                "status": "sent" if result.success else "failed",
                "error": result.error,
            },
        )
        await crud_notification_logs.create(
            db=db,
            object=NotificationLogCreateInternal(
                event_type=event.event_type,
                channel=channel,
                provider=result.provider,
                status=NotificationLogStatus.SENT if result.success else NotificationLogStatus.FAILED,
                error=result.error,
            ),
        )
