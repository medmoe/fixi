from unittest.mock import AsyncMock, patch

import pytest

from src.app.api.dependencies import require_role
from src.app.core.exceptions.http_exceptions import ForbiddenException


class TestRoleDependency:
    @pytest.mark.asyncio
    async def test_require_role_allows_expected_role(self):
        guard = require_role("handyman")

        with patch(
            "src.app.api.dependencies.verify_token",
            new=AsyncMock(return_value=type("TokenDataObj", (), {"role": "handyman"})()),
        ):
            current_user = {"id": 1, "username": "workerone"}
            result = await guard(token="token", db=AsyncMock(), current_user=current_user)
            assert result == current_user

    @pytest.mark.asyncio
    async def test_require_role_forbids_unexpected_role(self):
        guard = require_role("handyman")

        with patch(
            "src.app.api.dependencies.verify_token",
            new=AsyncMock(return_value=type("TokenDataObj", (), {"role": "customer"})()),
        ):
            with pytest.raises(ForbiddenException):
                await guard(token="token", db=AsyncMock(), current_user={"id": 1})
