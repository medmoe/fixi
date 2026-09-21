from unittest.mock import AsyncMock, patch

import firebase_admin
import pytest
from firebase_admin import messaging
from sqlalchemy import select

from src.app.models import DevicePlatform, DeviceToken
from src.app.services.notifications.providers import FcmPushProvider
from tests.conftest import create_test_user

PAYLOAD = {"title": "Job started", "body": "Your job has started."}


async def _add_device_token(async_session, user, token: str) -> DeviceToken:
    from datetime import UTC, datetime

    row = DeviceToken(user_id=user.id, token=token, platform=DevicePlatform.WEB, last_seen=datetime.now(UTC).replace(tzinfo=None))
    async_session.add(row)
    await async_session.commit()
    await async_session.refresh(row)
    return row


async def _tokens_for(async_session, user_id: int) -> list[str]:
    result = await async_session.execute(select(DeviceToken.token).where(DeviceToken.user_id == user_id))
    return [row[0] for row in result.all()]


@pytest.fixture(autouse=True)
def _fake_firebase_app():
    """Pretends an app is already initialized so `_init_app()` never touches
    real credentials -- the network call itself is always mocked separately."""
    firebase_admin._apps["[DEFAULT]"] = object()
    yield
    firebase_admin._apps.clear()


@pytest.mark.unit
class TestFcmPushProviderInitApp:
    """FCM_SERVICE_ACCOUNT_JSON accepts either the downloaded service account
    JSON pasted directly into the env var, or a file path -- most
    container/cloud deploys want the former since mounting a file is often
    the more awkward option there."""

    def test_parses_a_json_string_service_account_into_a_dict_credential(self, monkeypatch):
        firebase_admin._apps.clear()  # bypass the autouse fixture's short-circuit for this test
        monkeypatch.setattr(
            "src.app.services.notifications.providers.settings.FCM_SERVICE_ACCOUNT_JSON",
            '{"type": "service_account", "project_id": "fixi-test"}',
        )
        provider = FcmPushProvider()

        with patch("firebase_admin.credentials.Certificate") as mock_cert, patch("firebase_admin.initialize_app") as mock_init:
            provider._init_app()

        mock_cert.assert_called_once_with({"type": "service_account", "project_id": "fixi-test"})
        mock_init.assert_called_once()

    def test_falls_back_to_treating_a_non_json_value_as_a_file_path(self, monkeypatch):
        firebase_admin._apps.clear()
        monkeypatch.setattr(
            "src.app.services.notifications.providers.settings.FCM_SERVICE_ACCOUNT_JSON",
            "/etc/fixi/service-account.json",
        )
        provider = FcmPushProvider()

        with patch("firebase_admin.credentials.Certificate") as mock_cert, patch("firebase_admin.initialize_app") as mock_init:
            provider._init_app()

        mock_cert.assert_called_once_with("/etc/fixi/service-account.json")
        mock_init.assert_called_once()


@pytest.mark.unit
class TestFcmPushProvider:
    async def test_returns_failure_when_fcm_disabled(self, async_session, monkeypatch):
        monkeypatch.setattr("src.app.services.notifications.providers.settings.FCM_ENABLED", False)
        provider = FcmPushProvider()

        result = await provider.send(async_session, "1", "t", PAYLOAD)

        assert result.success is False
        assert "disabled" in result.error

    async def test_returns_failure_for_an_invalid_recipient(self, async_session, monkeypatch):
        monkeypatch.setattr("src.app.services.notifications.providers.settings.FCM_ENABLED", True)
        provider = FcmPushProvider()

        result = await provider.send(async_session, "not-an-id", "t", PAYLOAD)

        assert result.success is False
        assert "Invalid push recipient" in result.error

    async def test_returns_failure_when_the_user_has_no_registered_tokens(self, async_session, monkeypatch):
        monkeypatch.setattr("src.app.services.notifications.providers.settings.FCM_ENABLED", True)
        user = await create_test_user(async_session)
        provider = FcmPushProvider()

        result = await provider.send(async_session, str(user.id), "t", PAYLOAD)

        assert result.success is False
        assert "No device tokens" in result.error

    async def test_sends_a_multicast_to_every_registered_token_and_succeeds(self, async_session, monkeypatch):
        monkeypatch.setattr("src.app.services.notifications.providers.settings.FCM_ENABLED", True)
        user = await create_test_user(async_session)
        await _add_device_token(async_session, user, "token-1")
        await _add_device_token(async_session, user, "token-2")
        provider = FcmPushProvider()

        batch_response = messaging.BatchResponse([
            messaging.SendResponse({"name": "msg-1"}, None),
            messaging.SendResponse({"name": "msg-2"}, None),
        ])

        with patch("firebase_admin.messaging.send_each_for_multicast_async", AsyncMock(return_value=batch_response)) as mock_send:
            result = await provider.send(async_session, str(user.id), "t", PAYLOAD)

        assert result.success is True
        sent_message = mock_send.call_args.args[0]
        assert sorted(sent_message.tokens) == ["token-1", "token-2"]

    async def test_prunes_unregistered_tokens_after_a_partial_failure(self, async_session, monkeypatch):
        monkeypatch.setattr("src.app.services.notifications.providers.settings.FCM_ENABLED", True)
        user = await create_test_user(async_session)
        await _add_device_token(async_session, user, "good-token")
        await _add_device_token(async_session, user, "stale-token")
        provider = FcmPushProvider()

        batch_response = messaging.BatchResponse([
            messaging.SendResponse({"name": "msg-1"}, None),
            messaging.SendResponse(None, messaging.UnregisteredError("token no longer valid")),
        ])

        with patch("firebase_admin.messaging.send_each_for_multicast_async", AsyncMock(return_value=batch_response)):
            result = await provider.send(async_session, str(user.id), "t", PAYLOAD)

        assert result.success is True
        remaining = await _tokens_for(async_session, user.id)
        assert remaining == ["good-token"]

    async def test_returns_failure_and_still_prunes_when_every_token_fails(self, async_session, monkeypatch):
        monkeypatch.setattr("src.app.services.notifications.providers.settings.FCM_ENABLED", True)
        user = await create_test_user(async_session)
        await _add_device_token(async_session, user, "dead-token")
        provider = FcmPushProvider()

        batch_response = messaging.BatchResponse([
            messaging.SendResponse(None, messaging.UnregisteredError("token no longer valid")),
        ])

        with patch("firebase_admin.messaging.send_each_for_multicast_async", AsyncMock(return_value=batch_response)):
            result = await provider.send(async_session, str(user.id), "t", PAYLOAD)

        assert result.success is False
        assert await _tokens_for(async_session, user.id) == []

    async def test_a_non_unregistered_failure_is_not_pruned(self, async_session, monkeypatch):
        """A quota/transient error shouldn't nuke a token that might work later."""
        monkeypatch.setattr("src.app.services.notifications.providers.settings.FCM_ENABLED", True)
        user = await create_test_user(async_session)
        await _add_device_token(async_session, user, "throttled-token")
        provider = FcmPushProvider()

        batch_response = messaging.BatchResponse([
            messaging.SendResponse(None, messaging.QuotaExceededError("rate limited")),
        ])

        with patch("firebase_admin.messaging.send_each_for_multicast_async", AsyncMock(return_value=batch_response)):
            result = await provider.send(async_session, str(user.id), "t", PAYLOAD)

        assert result.success is False
        assert await _tokens_for(async_session, user.id) == ["throttled-token"]

    async def test_an_exception_from_the_sdk_is_captured_as_a_failed_result(self, async_session, monkeypatch):
        monkeypatch.setattr("src.app.services.notifications.providers.settings.FCM_ENABLED", True)
        user = await create_test_user(async_session)
        await _add_device_token(async_session, user, "token-1")
        provider = FcmPushProvider()

        with patch("firebase_admin.messaging.send_each_for_multicast_async", AsyncMock(side_effect=RuntimeError("network down"))):
            result = await provider.send(async_session, str(user.id), "t", PAYLOAD)

        assert result.success is False
        assert "network down" in result.error
