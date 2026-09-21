from __future__ import annotations

import json
import warnings
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import settings
from ...core.logger import logging
from ...crud.crud_device_tokens import crud_device_tokens

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

        title = str(payload.get("title", ""))
        body = str(payload.get("body", ""))
        data = {k: str(v) for k, v in payload.items() if k not in {"title", "body"}}

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
