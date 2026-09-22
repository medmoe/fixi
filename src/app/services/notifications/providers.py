from __future__ import annotations

import json
import warnings
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import EnvironmentOption, settings
from ...core.logger import logging
from ...crud.crud_device_tokens import crud_device_tokens
from ...models import PreferredLanguage, User
from .email_templates import EmailTemplateNotFound, render_email_template

logger = logging.getLogger(__name__)

# The per-language title_xx/body_xx keys every notify_user() payload carries
# (see services/notifications/events.py) -- FcmPushProvider picks exactly
# one pair per recipient (see below) and excludes the rest from FCM's `data`
# field rather than shipping all languages' copy to every device.
_LOCALIZED_PAYLOAD_KEYS = {f"title_{lang.value}" for lang in PreferredLanguage} | {f"body_{lang.value}" for lang in PreferredLanguage}


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
    async def send(self, db: AsyncSession, recipient: str, template: str, payload: dict[str, Any]) -> DeliveryResult:
        """Send `template` (with `payload`) to `recipient`, returning the outcome.
        `db` is there for providers that need to resolve or prune their own
        state (e.g. FCM looking up / cleaning up device tokens) -- most
        providers ignore it."""


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

    async def send(self, db: AsyncSession, recipient: str, template: str, payload: dict[str, Any]) -> DeliveryResult:
        logger.info("no-op email send", extra={"recipient": recipient, "template": template})
        return DeliveryResult(success=True, provider=self.name)


class NoOpPushProvider(PushProvider):
    name = "noop"

    async def send(self, db: AsyncSession, recipient: str, template: str, payload: dict[str, Any]) -> DeliveryResult:
        logger.info("no-op push send", extra={"recipient": recipient, "template": template})
        return DeliveryResult(success=True, provider=self.name)


class NoOpSmsProvider(SmsProvider):
    name = "noop"

    async def send(self, db: AsyncSession, recipient: str, template: str, payload: dict[str, Any]) -> DeliveryResult:
        logger.info("no-op sms send", extra={"recipient": recipient, "template": template})
        return DeliveryResult(success=True, provider=self.name)


class FcmPushProvider(PushProvider):
    """Wraps Firebase Cloud Messaging. `recipient` is a user id -- this
    provider resolves it to that user's registered device_tokens (a user can
    have several: multiple browsers/devices) and multicasts to all of them.
    A token FCM reports as UNREGISTERED is deleted immediately so it's never
    retried."""

    name = "fcm"

    def _init_app(self) -> None:
        import firebase_admin
        from firebase_admin import credentials

        if firebase_admin._apps:
            return
        if settings.FCM_SERVICE_ACCOUNT_JSON:
            # Accepts either a file path or the downloaded service account
            # JSON pasted directly into the env var -- the latter is what
            # most container/cloud deployments want, since mounting a file
            # is often the more awkward option there.
            try:
                cert: str | dict = json.loads(settings.FCM_SERVICE_ACCOUNT_JSON)
            except json.JSONDecodeError:
                cert = settings.FCM_SERVICE_ACCOUNT_JSON  # not JSON -- treat as a file path
            cred = credentials.Certificate(cert)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()

    async def send(self, db: AsyncSession, recipient: str, template: str, payload: dict[str, Any]) -> DeliveryResult:
        if not settings.FCM_ENABLED:
            return DeliveryResult(success=False, provider=self.name, error="FCM is disabled (FCM_ENABLED=false)")

        try:
            user_id = int(recipient)
        except (TypeError, ValueError):
            return DeliveryResult(success=False, provider=self.name, error=f"Invalid push recipient: {recipient!r}")

        try:
            import firebase_admin  # noqa: F401 -- import error path handled below
            from firebase_admin import messaging
        except Exception as exc:  # pragma: no cover - optional dependency path
            logger.warning("FCM enabled but firebase-admin is unavailable: %s", exc)
            return DeliveryResult(success=False, provider=self.name, error=str(exc))

        tokens_result = await crud_device_tokens.get_multi(db=db, user_id=user_id, limit=None, return_as_model=False)
        token_values = [row["token"] for row in tokens_result["data"]]
        if not token_values:
            return DeliveryResult(success=False, provider=self.name, error="No device tokens registered for this user")

        # Resolves the recipient's own preferred_language rather than
        # always sending French -- same idea as MailjetEmailProvider's
        # template selection below, and the in-app feed's client-side
        # title_ar/fr/en selection (see NotificationBell.tsx). Missing user
        # or a payload that only carries one language (French) both fall
        # back to French, never an empty notification.
        user = await db.get(User, user_id)
        language = user.preferred_language.value if user is not None else PreferredLanguage.FR.value
        title = str(payload.get(f"title_{language}") or payload.get(f"title_{PreferredLanguage.FR.value}", ""))
        body = str(payload.get(f"body_{language}") or payload.get(f"body_{PreferredLanguage.FR.value}", ""))
        data = {k: str(v) for k, v in payload.items() if k not in _LOCALIZED_PAYLOAD_KEYS}

        try:
            self._init_app()
            # `tokens=` is deprecated in favor of `fids=` (Firebase Installation
            # IDs), a different identifier requiring the separate Firebase
            # Installations SDK on the client. device_tokens stores classic FCM
            # registration tokens, so `tokens=` is deliberately still correct
            # here -- the warning is expected noise, not a bug, so it's silenced.
            # Note: firebase_admin raises this with stacklevel=2, so it's
            # attributed to *this* module, not firebase_admin.messaging --
            # `module=` can't be used to scope the filter, hence `message=`.
            with warnings.catch_warnings():
                warnings.filterwarnings("ignore", category=DeprecationWarning, message="MulticastMessage.tokens is deprecated")
                message = messaging.MulticastMessage(
                    notification=messaging.Notification(title=title, body=body),
                    data=data,
                    tokens=token_values,
                )
            batch_response = await messaging.send_each_for_multicast_async(message)
        except Exception as exc:  # pragma: no cover - external integration path
            logger.warning("FCM multicast send failed: %s", exc)
            return DeliveryResult(success=False, provider=self.name, error=str(exc))

        stale_tokens = [
            token
            for token, response in zip(token_values, batch_response.responses)
            if not response.success and isinstance(response.exception, messaging.UnregisteredError)
        ]
        if stale_tokens:
            await crud_device_tokens.delete(db=db, allow_multiple=True, token__in=stale_tokens)
            logger.info("pruned stale FCM device tokens", extra={"user_id": user_id, "count": len(stale_tokens)})

        if batch_response.success_count == 0:
            return DeliveryResult(
                success=False,
                provider=self.name,
                error=f"All {len(token_values)} device token(s) failed",
            )
        if batch_response.failure_count > 0:
            logger.warning(
                "FCM multicast partially failed",
                extra={"user_id": user_id, "success_count": batch_response.success_count, "failure_count": batch_response.failure_count},
            )
        return DeliveryResult(success=True, provider=self.name)


class Capcom6SmsProvider(SmsProvider):
    """Wraps the local SMS Gateway for Android app by capcom6
    (https://github.com/capcom6/android-sms-gateway) -- see
    documentation/SMS_GATEWAY_RUNBOOK.md for the hardware/software setup.

    Unlike Email/Push above, `recipient` here is a raw E.164 phone number,
    not a user id: OTP is sent before/without an authenticated user, so
    there's no User row to resolve it from.

    No retry here (unlike MailjetEmailProvider/NotificationService's
    `_send_with_retry`) -- a failed OTP send should surface to the caller
    immediately as a clear error (see Issue 5's "failover path" acceptance
    criterion) rather than silently retrying and making the user wait on a
    request that may still fail.
    """

    name = "capcom6"

    async def send(self, db: AsyncSession, recipient: str, template: str, payload: dict[str, Any]) -> DeliveryResult:
        if not settings.SMS_GATEWAY_BASE_URL:
            return DeliveryResult(success=False, provider=self.name, error="SMS_GATEWAY_BASE_URL is not configured -- no SIM gateway set up yet (see documentation/SMS_GATEWAY_RUNBOOK.md)")
        if not (settings.SMS_GATEWAY_USERNAME and settings.SMS_GATEWAY_PASSWORD):
            return DeliveryResult(success=False, provider=self.name, error="SMS gateway credentials are not configured")

        text = self._render(template, payload)
        if not text:
            return DeliveryResult(success=False, provider=self.name, error=f"No SMS text resolved for template {template!r}")

        body = {"textMessage": {"text": text}, "phoneNumbers": [recipient]}
        try:
            async with httpx.AsyncClient(timeout=settings.SMS_GATEWAY_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    f"{settings.SMS_GATEWAY_BASE_URL.rstrip('/')}/message",
                    json=body,
                    auth=(settings.SMS_GATEWAY_USERNAME, settings.SMS_GATEWAY_PASSWORD),
                )
            response.raise_for_status()
        except Exception as exc:  # pragma: no cover - external integration path, no gateway to hit yet
            logger.warning("SMS gateway send failed: %s", exc)
            return DeliveryResult(success=False, provider=self.name, error=str(exc))

        return DeliveryResult(success=True, provider=self.name)

    @staticmethod
    def _render(template: str, payload: dict[str, Any]) -> str:
        # Plain text only -- no AR/FR localization yet (unlike the email
        # templates) since OTP is sent before a User row exists to read
        # preferred_language off of. Revisit once/if OTP moves to always
        # following an authenticated step.
        if template == "otp_code":
            code = payload.get("code")
            if not code:
                return ""
            ttl_minutes = payload.get("ttl_minutes", 5)
            return f"Fixi: {code} is your verification code. It expires in {ttl_minutes} minute(s). Don't share this code with anyone."
        return str(payload.get("text", ""))


class MailjetEmailProvider(EmailProvider):
    """Wraps Mailjet's v3.1 send API over plain HTTP (Mailjet's own SDK is
    sync-only; httpx keeps this consistent with the rest of the app).
    `recipient` is a user id -- this provider resolves it to that user's
    email + preferred_language, renders the matching AR/FR HTML template,
    and skips anyone with a known-bad address (email_invalid, flipped by
    the bounce/complaint webhook) instead of retrying them forever.

    Outside ENVIRONMENT=production this always logs instead of sending, no
    matter what NOTIFICATION_EMAIL_PROVIDER says -- a deliberate second
    layer so staging can never send real email even with real Mailjet
    credentials configured (belt-and-suspenders over the provider switch).
    """

    name = "mailjet"

    async def send(self, db: AsyncSession, recipient: str, template: str, payload: dict[str, Any]) -> DeliveryResult:
        try:
            user_id = int(recipient)
        except (TypeError, ValueError):
            return DeliveryResult(success=False, provider=self.name, error=f"Invalid email recipient: {recipient!r}")

        user = await db.get(User, user_id)
        if user is None:
            return DeliveryResult(success=False, provider=self.name, error=f"No such user: {user_id}")
        if user.email_invalid:
            return DeliveryResult(success=False, provider=self.name, error="Recipient email previously bounced/complained -- skipped")

        language = user.preferred_language.value
        try:
            subject, html = render_email_template(template, language, {**payload, "recipient_name": user.name})
        except EmailTemplateNotFound as exc:
            return DeliveryResult(success=False, provider=self.name, error=str(exc))

        if settings.ENVIRONMENT != EnvironmentOption.PRODUCTION:
            logger.info("sandbox email (not sent)", extra={"to": user.email, "subject": subject, "template": template})
            return DeliveryResult(success=True, provider=self.name)

        if not (settings.MAILJET_API_KEY and settings.MAILJET_API_SECRET and settings.MAILJET_SENDER_EMAIL):
            return DeliveryResult(success=False, provider=self.name, error="Mailjet is not configured (missing API key/secret/sender email)")

        message = {
            "Messages": [
                {
                    "From": {"Email": settings.MAILJET_SENDER_EMAIL, "Name": settings.MAILJET_SENDER_NAME},
                    "To": [{"Email": user.email, "Name": user.name}],
                    "Subject": subject,
                    "HTMLPart": html,
                }
            ]
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    "https://api.mailjet.com/v3.1/send",
                    json=message,
                    auth=(settings.MAILJET_API_KEY, settings.MAILJET_API_SECRET),
                )
            response.raise_for_status()
        except Exception as exc:  # pragma: no cover - external integration path
            logger.warning("Mailjet send failed: %s", exc)
            return DeliveryResult(success=False, provider=self.name, error=str(exc))

        return DeliveryResult(success=True, provider=self.name)
