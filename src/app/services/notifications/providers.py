from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from ...core.config import settings
from ...core.logger import logging

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class DeliveryResult:
    success: bool
    provider: str
    error: str | None = None


class NotificationProvider(ABC):
    """Shared shape for every channel-specific provider interface below --
    callers only ever depend on these interfaces, never on a concrete SDK."""

    name: str

    @abstractmethod
    async def send(self, recipient: str, template: str, payload: dict[str, Any]) -> DeliveryResult:
        """Send `template` (with `payload`) to `recipient`, returning the outcome."""


class EmailProvider(NotificationProvider):
    """Interface every email adapter (Mailjet, ...) implements."""


class PushProvider(NotificationProvider):
    """Interface every push adapter (FCM, ...) implements."""


class SmsProvider(NotificationProvider):
    """Interface every SMS adapter (local SIM gateway, ...) implements."""


# ─── No-op / stub providers ──────────────────────────────────────────────────
# Default for every channel (see NOTIFICATION_*_PROVIDER settings) so
# staging/tests never need real credentials just to exercise the send path.

class NoOpEmailProvider(EmailProvider):
    name = "noop"

    async def send(self, recipient: str, template: str, payload: dict[str, Any]) -> DeliveryResult:
        logger.info("no-op email send", extra={"recipient": recipient, "template": template})
        return DeliveryResult(success=True, provider=self.name)


class NoOpPushProvider(PushProvider):
    name = "noop"

    async def send(self, recipient: str, template: str, payload: dict[str, Any]) -> DeliveryResult:
        logger.info("no-op push send", extra={"recipient": recipient, "template": template})
        return DeliveryResult(success=True, provider=self.name)


class NoOpSmsProvider(SmsProvider):
    name = "noop"

    async def send(self, recipient: str, template: str, payload: dict[str, Any]) -> DeliveryResult:
        logger.info("no-op sms send", extra={"recipient": recipient, "template": template})
        return DeliveryResult(success=True, provider=self.name)


class FcmPushProvider(PushProvider):
    """Wraps Firebase Cloud Messaging. `recipient` is the FCM topic name
    (see FCM_TOPIC_PREFIX). Migrated from the old ad-hoc
    `notify_user_status_change` helper so it now goes through the same
    provider interface -- and retry/logging -- as every other channel."""

    name = "fcm"

    async def send(self, recipient: str, template: str, payload: dict[str, Any]) -> DeliveryResult:
        if not settings.FCM_ENABLED:
            return DeliveryResult(success=False, provider=self.name, error="FCM is disabled (FCM_ENABLED=false)")

        try:
            import firebase_admin
            from firebase_admin import credentials, messaging
        except Exception as exc:  # pragma: no cover - optional dependency path
            logger.warning("FCM enabled but firebase-admin is unavailable: %s", exc)
            return DeliveryResult(success=False, provider=self.name, error=str(exc))

        title = str(payload.get("title", ""))
        body = str(payload.get("body", ""))
        data = {k: str(v) for k, v in payload.items() if k not in {"title", "body"}}

        try:
            if not firebase_admin._apps:
                if settings.FCM_SERVICE_ACCOUNT_JSON:
                    cred = credentials.Certificate(settings.FCM_SERVICE_ACCOUNT_JSON)
                    firebase_admin.initialize_app(cred)
                else:
                    firebase_admin.initialize_app()

            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                topic=recipient,
                data=data,
            )
            await asyncio.to_thread(messaging.send, message)
            return DeliveryResult(success=True, provider=self.name)
        except Exception as exc:  # pragma: no cover - external integration path
            logger.warning("FCM send failed: %s", exc)
            return DeliveryResult(success=False, provider=self.name, error=str(exc))
