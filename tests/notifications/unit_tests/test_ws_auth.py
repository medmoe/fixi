import pytest

from src.app.api.dependencies import get_current_user_ws
from src.app.core.security import create_access_token, create_token_payload
from tests.conftest import create_test_user


class FakeWebSocket:
    """Just enough surface for get_current_user_ws: it only reads query_params."""

    def __init__(self, token: str | None = None) -> None:
        self.query_params = {"token": token} if token is not None else {}


async def _access_token_for(user) -> str:
    return await create_access_token(data=create_token_payload(user))


@pytest.mark.unit
class TestGetCurrentUserWs:
    async def test_returns_the_user_for_a_valid_token(self, async_session):
        user = await create_test_user(async_session)
        token = await _access_token_for(user)
        ws = FakeWebSocket(token=token)

        result = await get_current_user_ws(ws, async_session)

        assert result is not None
        assert result["id"] == user.id
        assert result["username"] == user.username

    async def test_returns_none_when_no_token_query_param(self, async_session):
        ws = FakeWebSocket(token=None)

        result = await get_current_user_ws(ws, async_session)

        assert result is None

    async def test_returns_none_for_a_garbage_token(self, async_session):
        ws = FakeWebSocket(token="not-a-real-jwt")

        result = await get_current_user_ws(ws, async_session)

        assert result is None

    async def test_returns_none_for_a_deleted_user(self, async_session):
        user = await create_test_user(async_session, is_deleted=True)
        token = await _access_token_for(user)
        ws = FakeWebSocket(token=token)

        result = await get_current_user_ws(ws, async_session)

        assert result is None
