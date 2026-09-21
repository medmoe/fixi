import pytest

SETTINGS_PATH = "src.app.core.config.settings"


@pytest.mark.integration
class TestOtpEndpoints:
    async def test_send_then_verify_round_trip(self, async_client_with_redis, monkeypatch):
        client, _ = async_client_with_redis
        monkeypatch.setattr("src.app.services.otp._generate_code", lambda length: "424242")

        send_response = await client.post("/api/v1/auth/otp/send", json={"phone_number": "+213555000000"})
        assert send_response.status_code == 202
        assert send_response.json() == {"detail": "OTP sent"}

        verify_response = await client.post("/api/v1/auth/otp/verify", json={"phone_number": "+213555000000", "code": "424242"})
        assert verify_response.status_code == 200
        assert verify_response.json() == {"verified": True}

    async def test_verify_with_wrong_code_returns_false_not_an_error(self, async_client_with_redis, monkeypatch):
        client, _ = async_client_with_redis
        monkeypatch.setattr("src.app.services.otp._generate_code", lambda length: "424242")

        await client.post("/api/v1/auth/otp/send", json={"phone_number": "+213555000001"})
        verify_response = await client.post("/api/v1/auth/otp/verify", json={"phone_number": "+213555000001", "code": "000000"})

        assert verify_response.status_code == 200
        assert verify_response.json() == {"verified": False}

    async def test_verify_for_a_number_that_never_got_a_code_returns_false(self, async_client_with_redis):
        client, _ = async_client_with_redis

        response = await client.post("/api/v1/auth/otp/verify", json={"phone_number": "+213555000002", "code": "123456"})

        assert response.status_code == 200
        assert response.json() == {"verified": False}

    async def test_resending_immediately_is_rate_limited(self, async_client_with_redis):
        client, _ = async_client_with_redis

        first = await client.post("/api/v1/auth/otp/send", json={"phone_number": "+213555000003"})
        assert first.status_code == 202

        second = await client.post("/api/v1/auth/otp/send", json={"phone_number": "+213555000003"})
        assert second.status_code == 429

    async def test_rejects_a_non_e164_phone_number(self, async_client_with_redis):
        client, _ = async_client_with_redis

        response = await client.post("/api/v1/auth/otp/send", json={"phone_number": "0555000000"})

        assert response.status_code == 422

    async def test_gateway_misconfiguration_surfaces_as_a_clear_503_not_a_silent_200(self, async_client_with_redis, monkeypatch):
        client, _ = async_client_with_redis
        monkeypatch.setattr(f"{SETTINGS_PATH}.NOTIFICATION_SMS_PROVIDER", "capcom6")
        monkeypatch.setattr(f"{SETTINGS_PATH}.SMS_GATEWAY_BASE_URL", None)

        response = await client.post("/api/v1/auth/otp/send", json={"phone_number": "+213555000004"})

        assert response.status_code == 503
