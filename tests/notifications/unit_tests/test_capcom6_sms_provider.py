from unittest.mock import AsyncMock, patch

import httpx
import pytest

from src.app.services.notifications.providers import Capcom6SmsProvider

SETTINGS_PATH = "src.app.services.notifications.providers.settings"


@pytest.mark.unit
class TestCapcom6SmsProvider:
    """No SIM/gateway is provisioned yet -- see documentation/
    SMS_GATEWAY_RUNBOOK.md -- so every one of these exercises the provider
    against a mocked HTTP endpoint rather than a real device."""

    async def test_returns_failure_when_base_url_is_not_configured(self, async_session, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.SMS_GATEWAY_BASE_URL", None)
        provider = Capcom6SmsProvider()

        result = await provider.send(async_session, "+213555000000", "otp_code", {"code": "123456"})

        assert result.success is False
        assert "SMS_GATEWAY_BASE_URL" in result.error

    async def test_returns_failure_when_credentials_are_not_configured(self, async_session, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.SMS_GATEWAY_BASE_URL", "http://phone.local:8080")
        monkeypatch.setattr(f"{SETTINGS_PATH}.SMS_GATEWAY_USERNAME", None)
        monkeypatch.setattr(f"{SETTINGS_PATH}.SMS_GATEWAY_PASSWORD", None)
        provider = Capcom6SmsProvider()

        result = await provider.send(async_session, "+213555000000", "otp_code", {"code": "123456"})

        assert result.success is False
        assert "credentials" in result.error

    async def test_returns_failure_for_an_unknown_template_with_no_text(self, async_session, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.SMS_GATEWAY_BASE_URL", "http://phone.local:8080")
        monkeypatch.setattr(f"{SETTINGS_PATH}.SMS_GATEWAY_USERNAME", "gw-user")
        monkeypatch.setattr(f"{SETTINGS_PATH}.SMS_GATEWAY_PASSWORD", "gw-pass")
        provider = Capcom6SmsProvider()

        result = await provider.send(async_session, "+213555000000", "does_not_exist", {})

        assert result.success is False
        assert "No SMS text resolved" in result.error

    async def test_sends_the_otp_code_via_the_gateway_when_configured(self, async_session, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.SMS_GATEWAY_BASE_URL", "http://phone.local:8080")
        monkeypatch.setattr(f"{SETTINGS_PATH}.SMS_GATEWAY_USERNAME", "gw-user")
        monkeypatch.setattr(f"{SETTINGS_PATH}.SMS_GATEWAY_PASSWORD", "gw-pass")
        provider = Capcom6SmsProvider()

        mock_response = httpx.Response(202, request=httpx.Request("POST", "http://phone.local:8080/message"))
        with patch("httpx.AsyncClient.post", AsyncMock(return_value=mock_response)) as mock_post:
            result = await provider.send(async_session, "+213555000000", "otp_code", {"code": "123456", "ttl_minutes": 5})

        assert result.success is True
        assert result.provider == "capcom6"
        sent_args, sent_kwargs = mock_post.call_args
        assert sent_args[0] == "http://phone.local:8080/message"
        assert sent_kwargs["json"]["phoneNumbers"] == ["+213555000000"]
        assert "123456" in sent_kwargs["json"]["textMessage"]["text"]
        assert sent_kwargs["auth"] == ("gw-user", "gw-pass")

    async def test_sends_arbitrary_text_for_a_non_otp_template(self, async_session, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.SMS_GATEWAY_BASE_URL", "http://phone.local:8080")
        monkeypatch.setattr(f"{SETTINGS_PATH}.SMS_GATEWAY_USERNAME", "gw-user")
        monkeypatch.setattr(f"{SETTINGS_PATH}.SMS_GATEWAY_PASSWORD", "gw-pass")
        provider = Capcom6SmsProvider()

        mock_response = httpx.Response(202, request=httpx.Request("POST", "http://phone.local:8080/message"))
        with patch("httpx.AsyncClient.post", AsyncMock(return_value=mock_response)) as mock_post:
            result = await provider.send(async_session, "+213555000000", "some_other_template", {"text": "hello there"})

        assert result.success is True
        assert mock_post.call_args.kwargs["json"]["textMessage"]["text"] == "hello there"

    async def test_a_send_failure_is_captured_as_a_failed_result(self, async_session, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.SMS_GATEWAY_BASE_URL", "http://phone.local:8080")
        monkeypatch.setattr(f"{SETTINGS_PATH}.SMS_GATEWAY_USERNAME", "gw-user")
        monkeypatch.setattr(f"{SETTINGS_PATH}.SMS_GATEWAY_PASSWORD", "gw-pass")
        provider = Capcom6SmsProvider()

        with patch("httpx.AsyncClient.post", AsyncMock(side_effect=httpx.ConnectError("gateway unreachable"))):
            result = await provider.send(async_session, "+213555000000", "otp_code", {"code": "123456"})

        assert result.success is False
        assert "gateway unreachable" in result.error
