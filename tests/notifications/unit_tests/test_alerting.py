from unittest.mock import AsyncMock, patch

import httpx
import pytest

from src.app.core.config import EnvironmentOption
from src.app.services.alerting import (
    MailjetAdminAlertProvider,
    NoOpAdminAlertProvider,
    SlackAdminAlertProvider,
    TelegramAdminAlertProvider,
    resolve_admin_alert_provider,
)

SETTINGS_PATH = "src.app.services.alerting.settings"


@pytest.mark.unit
class TestNoOpAdminAlertProvider:
    async def test_always_succeeds(self):
        result = await NoOpAdminAlertProvider().send("something is on fire")
        assert result.success is True
        assert result.provider == "noop"


@pytest.mark.unit
class TestSlackAdminAlertProvider:
    """settings.ENVIRONMENT is 'test' in this suite (see .env.test), so
    every one of these exercises the sandbox path unless a test explicitly
    overrides it to PRODUCTION -- same pattern as MailjetEmailProvider's
    tests."""

    async def test_logs_instead_of_posting_outside_production(self, monkeypatch):
        provider = SlackAdminAlertProvider()

        with patch("httpx.AsyncClient.post") as mock_post:
            result = await provider.send("test alert")

        assert result.success is True
        mock_post.assert_not_called()

    async def test_returns_failure_when_not_configured(self, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.ENVIRONMENT", EnvironmentOption.PRODUCTION)
        monkeypatch.setattr(f"{SETTINGS_PATH}.ADMIN_ALERT_SLACK_WEBHOOK_URL", None)
        provider = SlackAdminAlertProvider()

        result = await provider.send("test alert")

        assert result.success is False
        assert "ADMIN_ALERT_SLACK_WEBHOOK_URL" in result.error

    async def test_posts_to_the_configured_webhook(self, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.ENVIRONMENT", EnvironmentOption.PRODUCTION)
        monkeypatch.setattr(f"{SETTINGS_PATH}.ADMIN_ALERT_SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/xxx")
        provider = SlackAdminAlertProvider()

        mock_response = httpx.Response(200, request=httpx.Request("POST", "https://hooks.slack.com/services/xxx"))
        with patch("httpx.AsyncClient.post", AsyncMock(return_value=mock_response)) as mock_post:
            result = await provider.send("SMS OTP failure rate spike")

        assert result.success is True
        assert mock_post.call_args.args[0] == "https://hooks.slack.com/services/xxx"
        assert mock_post.call_args.kwargs["json"] == {"text": "SMS OTP failure rate spike"}

    async def test_a_post_failure_is_captured_as_a_failed_result(self, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.ENVIRONMENT", EnvironmentOption.PRODUCTION)
        monkeypatch.setattr(f"{SETTINGS_PATH}.ADMIN_ALERT_SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/xxx")
        provider = SlackAdminAlertProvider()

        with patch("httpx.AsyncClient.post", AsyncMock(side_effect=httpx.ConnectError("network down"))):
            result = await provider.send("test alert")

        assert result.success is False
        assert "network down" in result.error


@pytest.mark.unit
class TestMailjetAdminAlertProvider:
    async def test_logs_instead_of_sending_outside_production(self):
        provider = MailjetAdminAlertProvider()

        with patch("httpx.AsyncClient.post") as mock_post:
            result = await provider.send("test alert")

        assert result.success is True
        mock_post.assert_not_called()

    async def test_returns_failure_when_not_fully_configured(self, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.ENVIRONMENT", EnvironmentOption.PRODUCTION)
        monkeypatch.setattr(f"{SETTINGS_PATH}.ADMIN_ALERT_EMAIL", None)
        provider = MailjetAdminAlertProvider()

        result = await provider.send("test alert")

        assert result.success is False

    async def test_sends_via_mailjet_when_configured(self, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.ENVIRONMENT", EnvironmentOption.PRODUCTION)
        monkeypatch.setattr(f"{SETTINGS_PATH}.ADMIN_ALERT_EMAIL", "ops@fixi.example")
        monkeypatch.setattr(f"{SETTINGS_PATH}.MAILJET_API_KEY", "test-key")
        monkeypatch.setattr(f"{SETTINGS_PATH}.MAILJET_API_SECRET", "test-secret")
        monkeypatch.setattr(f"{SETTINGS_PATH}.MAILJET_SENDER_EMAIL", "noreply@fixi.example")
        provider = MailjetAdminAlertProvider()

        mock_response = httpx.Response(200, request=httpx.Request("POST", "https://api.mailjet.com/v3.1/send"))
        with patch("httpx.AsyncClient.post", AsyncMock(return_value=mock_response)) as mock_post:
            result = await provider.send("SMS OTP failure rate spike")

        assert result.success is True
        sent_json = mock_post.call_args.kwargs["json"]
        assert sent_json["Messages"][0]["To"][0]["Email"] == "ops@fixi.example"
        assert sent_json["Messages"][0]["TextPart"] == "SMS OTP failure rate spike"


@pytest.mark.unit
class TestTelegramAdminAlertProvider:
    async def test_logs_instead_of_sending_outside_production(self):
        provider = TelegramAdminAlertProvider()

        with patch("httpx.AsyncClient.post") as mock_post:
            result = await provider.send("test alert")

        assert result.success is True
        mock_post.assert_not_called()

    async def test_returns_failure_when_not_fully_configured(self, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.ENVIRONMENT", EnvironmentOption.PRODUCTION)
        monkeypatch.setattr(f"{SETTINGS_PATH}.ADMIN_ALERT_TELEGRAM_BOT_TOKEN", None)
        provider = TelegramAdminAlertProvider()

        result = await provider.send("test alert")

        assert result.success is False

    async def test_posts_to_the_telegram_bot_api(self, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.ENVIRONMENT", EnvironmentOption.PRODUCTION)
        monkeypatch.setattr(f"{SETTINGS_PATH}.ADMIN_ALERT_TELEGRAM_BOT_TOKEN", "test-token")
        monkeypatch.setattr(f"{SETTINGS_PATH}.ADMIN_ALERT_TELEGRAM_CHAT_ID", "-1001234567890")
        provider = TelegramAdminAlertProvider()

        mock_response = httpx.Response(200, request=httpx.Request("POST", "https://api.telegram.org/bottest-token/sendMessage"))
        with patch("httpx.AsyncClient.post", AsyncMock(return_value=mock_response)) as mock_post:
            result = await provider.send("SMS OTP failure rate spike")

        assert result.success is True
        assert mock_post.call_args.args[0] == "https://api.telegram.org/bottest-token/sendMessage"
        assert mock_post.call_args.kwargs["json"] == {"chat_id": "-1001234567890", "text": "SMS OTP failure rate spike"}

    async def test_a_post_failure_is_captured_as_a_failed_result(self, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.ENVIRONMENT", EnvironmentOption.PRODUCTION)
        monkeypatch.setattr(f"{SETTINGS_PATH}.ADMIN_ALERT_TELEGRAM_BOT_TOKEN", "test-token")
        monkeypatch.setattr(f"{SETTINGS_PATH}.ADMIN_ALERT_TELEGRAM_CHAT_ID", "-1001234567890")
        provider = TelegramAdminAlertProvider()

        with patch("httpx.AsyncClient.post", AsyncMock(side_effect=httpx.ConnectError("network down"))):
            result = await provider.send("test alert")

        assert result.success is False
        assert "network down" in result.error


@pytest.mark.unit
class TestResolveAdminAlertProvider:
    def test_defaults_to_noop(self, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.ADMIN_ALERT_PROVIDER", "noop")
        assert isinstance(resolve_admin_alert_provider(), NoOpAdminAlertProvider)

    def test_resolves_slack(self, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.ADMIN_ALERT_PROVIDER", "slack")
        assert isinstance(resolve_admin_alert_provider(), SlackAdminAlertProvider)

    def test_resolves_mailjet(self, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.ADMIN_ALERT_PROVIDER", "mailjet")
        assert isinstance(resolve_admin_alert_provider(), MailjetAdminAlertProvider)

    def test_resolves_telegram(self, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.ADMIN_ALERT_PROVIDER", "telegram")
        assert isinstance(resolve_admin_alert_provider(), TelegramAdminAlertProvider)

    def test_raises_for_an_unknown_provider(self, monkeypatch):
        monkeypatch.setattr(f"{SETTINGS_PATH}.ADMIN_ALERT_PROVIDER", "carrier-pigeon")
        with pytest.raises(ValueError, match="Unknown admin alert provider"):
            resolve_admin_alert_provider()
