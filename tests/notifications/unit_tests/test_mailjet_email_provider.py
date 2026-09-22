from unittest.mock import AsyncMock, patch

import httpx
import pytest

from src.app.core.config import EnvironmentOption
from src.app.models.user import PreferredLanguage
from src.app.services.notifications.providers import MailjetEmailProvider
from tests.conftest import create_test_user

PAYLOAD = {
    "title_ar": "عنوان",
    "title_fr": "Titre",
    "body_ar": "نص",
    "body_fr": "Corps",
    "reviewer_name": "Karim",
    "rating": "5",
    "job_title": "Plomberie",
    "comment": "Great work",
    "app_url": "https://fixi.example/dashboard",
}


@pytest.mark.unit
class TestMailjetEmailProviderSandbox:
    """settings.ENVIRONMENT is 'test' in this suite (see .env.test), so
    every one of these exercises the sandbox path unless a test explicitly
    overrides it to PRODUCTION."""

    async def test_logs_instead_of_sending_outside_production(self, async_session):
        user = await create_test_user(async_session)
        provider = MailjetEmailProvider()

        with patch("httpx.AsyncClient.post") as mock_post:
            result = await provider.send(async_session, str(user.id), "review_received", PAYLOAD)

        assert result.success is True
        assert result.provider == "mailjet"
        mock_post.assert_not_called()

    async def test_returns_failure_for_an_invalid_recipient(self, async_session):
        provider = MailjetEmailProvider()
        result = await provider.send(async_session, "not-an-id", "review_received", PAYLOAD)
        assert result.success is False
        assert "Invalid email recipient" in result.error

    async def test_returns_failure_when_the_user_does_not_exist(self, async_session):
        provider = MailjetEmailProvider()
        result = await provider.send(async_session, "999999", "review_received", PAYLOAD)
        assert result.success is False
        assert "No such user" in result.error

    async def test_skips_a_user_with_a_previously_bounced_email(self, async_session):
        user = await create_test_user(async_session, email_invalid=True)
        provider = MailjetEmailProvider()

        result = await provider.send(async_session, str(user.id), "review_received", PAYLOAD)

        assert result.success is False
        assert "bounced" in result.error

    async def test_returns_failure_for_an_unknown_template(self, async_session):
        user = await create_test_user(async_session)
        provider = MailjetEmailProvider()

        result = await provider.send(async_session, str(user.id), "does_not_exist", PAYLOAD)

        assert result.success is False


@pytest.mark.unit
class TestMailjetEmailProviderProduction:
    async def test_returns_failure_when_mailjet_is_not_configured(self, async_session, monkeypatch):
        monkeypatch.setattr("src.app.services.notifications.providers.settings.ENVIRONMENT", EnvironmentOption.PRODUCTION)
        monkeypatch.setattr("src.app.services.notifications.providers.settings.MAILJET_API_KEY", None)
        user = await create_test_user(async_session)
        provider = MailjetEmailProvider()

        result = await provider.send(async_session, str(user.id), "review_received", PAYLOAD)

        assert result.success is False
        assert "not configured" in result.error

    async def test_sends_via_mailjet_when_configured(self, async_session, monkeypatch):
        monkeypatch.setattr("src.app.services.notifications.providers.settings.ENVIRONMENT", EnvironmentOption.PRODUCTION)
        monkeypatch.setattr("src.app.services.notifications.providers.settings.MAILJET_API_KEY", "test-key")
        monkeypatch.setattr("src.app.services.notifications.providers.settings.MAILJET_API_SECRET", "test-secret")
        monkeypatch.setattr("src.app.services.notifications.providers.settings.MAILJET_SENDER_EMAIL", "noreply@fixi.example")
        user = await create_test_user(async_session, preferred_language=PreferredLanguage.FR)
        provider = MailjetEmailProvider()

        mock_response = httpx.Response(200, request=httpx.Request("POST", "https://api.mailjet.com/v3.1/send"))
        with patch("httpx.AsyncClient.post", AsyncMock(return_value=mock_response)) as mock_post:
            result = await provider.send(async_session, str(user.id), "review_received", PAYLOAD)

        assert result.success is True
        sent_kwargs = mock_post.call_args.kwargs
        assert sent_kwargs["json"]["Messages"][0]["To"][0]["Email"] == user.email
        assert sent_kwargs["json"]["Messages"][0]["Subject"] == "Vous avez reçu un nouvel avis"
        assert sent_kwargs["auth"] == ("test-key", "test-secret")

    async def test_selects_the_arabic_template_for_arabic_preferring_users(self, async_session, monkeypatch):
        monkeypatch.setattr("src.app.services.notifications.providers.settings.ENVIRONMENT", EnvironmentOption.PRODUCTION)
        monkeypatch.setattr("src.app.services.notifications.providers.settings.MAILJET_API_KEY", "test-key")
        monkeypatch.setattr("src.app.services.notifications.providers.settings.MAILJET_API_SECRET", "test-secret")
        monkeypatch.setattr("src.app.services.notifications.providers.settings.MAILJET_SENDER_EMAIL", "noreply@fixi.example")
        user = await create_test_user(async_session, preferred_language=PreferredLanguage.AR)
        provider = MailjetEmailProvider()

        mock_response = httpx.Response(200, request=httpx.Request("POST", "https://api.mailjet.com/v3.1/send"))
        with patch("httpx.AsyncClient.post", AsyncMock(return_value=mock_response)) as mock_post:
            await provider.send(async_session, str(user.id), "review_received", PAYLOAD)

        subject = mock_post.call_args.kwargs["json"]["Messages"][0]["Subject"]
        assert subject == "لقد تلقيت تقييماً جديداً"

    async def test_selects_the_english_template_for_english_preferring_users(self, async_session, monkeypatch):
        monkeypatch.setattr("src.app.services.notifications.providers.settings.ENVIRONMENT", EnvironmentOption.PRODUCTION)
        monkeypatch.setattr("src.app.services.notifications.providers.settings.MAILJET_API_KEY", "test-key")
        monkeypatch.setattr("src.app.services.notifications.providers.settings.MAILJET_API_SECRET", "test-secret")
        monkeypatch.setattr("src.app.services.notifications.providers.settings.MAILJET_SENDER_EMAIL", "noreply@fixi.example")
        user = await create_test_user(async_session, preferred_language=PreferredLanguage.EN)
        provider = MailjetEmailProvider()

        mock_response = httpx.Response(200, request=httpx.Request("POST", "https://api.mailjet.com/v3.1/send"))
        with patch("httpx.AsyncClient.post", AsyncMock(return_value=mock_response)) as mock_post:
            await provider.send(async_session, str(user.id), "review_received", PAYLOAD)

        subject = mock_post.call_args.kwargs["json"]["Messages"][0]["Subject"]
        assert subject == "You received a new review"

    async def test_a_send_failure_is_captured_as_a_failed_result(self, async_session, monkeypatch):
        monkeypatch.setattr("src.app.services.notifications.providers.settings.ENVIRONMENT", EnvironmentOption.PRODUCTION)
        monkeypatch.setattr("src.app.services.notifications.providers.settings.MAILJET_API_KEY", "test-key")
        monkeypatch.setattr("src.app.services.notifications.providers.settings.MAILJET_API_SECRET", "test-secret")
        monkeypatch.setattr("src.app.services.notifications.providers.settings.MAILJET_SENDER_EMAIL", "noreply@fixi.example")
        user = await create_test_user(async_session)
        provider = MailjetEmailProvider()

        with patch("httpx.AsyncClient.post", AsyncMock(side_effect=httpx.ConnectError("network down"))):
            result = await provider.send(async_session, str(user.id), "review_received", PAYLOAD)

        assert result.success is False
        assert "network down" in result.error
