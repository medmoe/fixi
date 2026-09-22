from __future__ import annotations

from abc import ABC, abstractmethod

import httpx

from ..core.config import EnvironmentOption, settings
from ..core.logger import logging
from .notifications.providers import DeliveryResult

logger = logging.getLogger(__name__)


class AdminAlertProvider(ABC):
    """Pages an internal ops channel (Issue 7) -- deliberately separate
    from NotificationProvider (services/notifications/providers.py): that
    hierarchy resolves a *user* to their contact info for a per-user
    notification, where an admin alert has a fixed destination (one Slack
    webhook, one ops inbox) and no recipient/template/payload to resolve."""

    name: str

    @abstractmethod
    async def send(self, message: str) -> DeliveryResult:
        """Send a plain-text `message` to the admin channel."""


class NoOpAdminAlertProvider(AdminAlertProvider):
    name = "noop"

    async def send(self, message: str) -> DeliveryResult:
        logger.info("no-op admin alert", extra={"alert_message": message})
        return DeliveryResult(success=True, provider=self.name)


class SlackAdminAlertProvider(AdminAlertProvider):
    """Posts to a Slack incoming webhook
    (https://api.slack.com/messaging/webhooks). Outside ENVIRONMENT=production
    this always logs instead of posting, no matter what ADMIN_ALERT_PROVIDER
    says -- same belt-and-suspenders reasoning as MailjetEmailProvider:
    staging notification-log noise (no real SMS gateway there) must never
    page anyone."""

    name = "slack"

    async def send(self, message: str) -> DeliveryResult:
        if settings.ENVIRONMENT != EnvironmentOption.PRODUCTION:
            logger.info("sandbox admin alert (not posted to Slack)", extra={"alert_message": message})
            return DeliveryResult(success=True, provider=self.name)

        if not settings.ADMIN_ALERT_SLACK_WEBHOOK_URL:
            return DeliveryResult(success=False, provider=self.name, error="ADMIN_ALERT_SLACK_WEBHOOK_URL is not configured")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(settings.ADMIN_ALERT_SLACK_WEBHOOK_URL, json={"text": message})
            response.raise_for_status()
        except Exception as exc:  # pragma: no cover - external integration path
            logger.warning("Slack admin alert failed: %s", exc)
            return DeliveryResult(success=False, provider=self.name, error=str(exc))

        return DeliveryResult(success=True, provider=self.name)


class MailjetAdminAlertProvider(AdminAlertProvider):
    """Sends a plain-text email via the same Mailjet account as user-facing
    email (NotificationSettings.MAILJET_*) to a fixed ops address -- not the
    per-user templated path MailjetEmailProvider uses, since there's no User
    row and no AR/FR template for an ops alert. Same production-only gating
    as SlackAdminAlertProvider."""

    name = "mailjet"

    async def send(self, message: str) -> DeliveryResult:
        if settings.ENVIRONMENT != EnvironmentOption.PRODUCTION:
            logger.info("sandbox admin alert (not emailed)", extra={"alert_message": message})
            return DeliveryResult(success=True, provider=self.name)

        if not (settings.ADMIN_ALERT_EMAIL and settings.MAILJET_API_KEY and settings.MAILJET_API_SECRET and settings.MAILJET_SENDER_EMAIL):
            return DeliveryResult(success=False, provider=self.name, error="Mailjet admin alert email is not fully configured")

        payload = {
            "Messages": [
                {
                    "From": {"Email": settings.MAILJET_SENDER_EMAIL, "Name": settings.MAILJET_SENDER_NAME},
                    "To": [{"Email": settings.ADMIN_ALERT_EMAIL}],
                    "Subject": "Fixi alert",
                    "TextPart": message,
                }
            ]
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    "https://api.mailjet.com/v3.1/send",
                    json=payload,
                    auth=(settings.MAILJET_API_KEY, settings.MAILJET_API_SECRET),
                )
            response.raise_for_status()
        except Exception as exc:  # pragma: no cover - external integration path
            logger.warning("Mailjet admin alert failed: %s", exc)
            return DeliveryResult(success=False, provider=self.name, error=str(exc))

        return DeliveryResult(success=True, provider=self.name)


class TelegramAdminAlertProvider(AdminAlertProvider):
    """Posts to a Telegram chat/channel via a bot
    (https://core.telegram.org/bots/api#sendmessage). Same production-only
    gating as SlackAdminAlertProvider/MailjetAdminAlertProvider."""

    name = "telegram"

    async def send(self, message: str) -> DeliveryResult:
        if settings.ENVIRONMENT != EnvironmentOption.PRODUCTION:
            logger.info("sandbox admin alert (not sent to Telegram)", extra={"alert_message": message})
            return DeliveryResult(success=True, provider=self.name)

        if not (settings.ADMIN_ALERT_TELEGRAM_BOT_TOKEN and settings.ADMIN_ALERT_TELEGRAM_CHAT_ID):
            return DeliveryResult(success=False, provider=self.name, error="Telegram admin alert is not fully configured")

        url = f"https://api.telegram.org/bot{settings.ADMIN_ALERT_TELEGRAM_BOT_TOKEN}/sendMessage"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json={"chat_id": settings.ADMIN_ALERT_TELEGRAM_CHAT_ID, "text": message})
            response.raise_for_status()
        except Exception as exc:  # pragma: no cover - external integration path
            logger.warning("Telegram admin alert failed: %s", exc)
            return DeliveryResult(success=False, provider=self.name, error=str(exc))

        return DeliveryResult(success=True, provider=self.name)


def resolve_admin_alert_provider() -> AdminAlertProvider:
    name = settings.ADMIN_ALERT_PROVIDER
    if name == "slack":
        return SlackAdminAlertProvider()
    if name == "mailjet":
        return MailjetAdminAlertProvider()
    if name == "telegram":
        return TelegramAdminAlertProvider()
    if name == "noop":
        return NoOpAdminAlertProvider()
    raise ValueError(f"Unknown admin alert provider: {name!r}")
