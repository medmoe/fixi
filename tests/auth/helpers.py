from datetime import timedelta
from typing import Any

from src.app.core.security import create_refresh_token
from src.app.models import UserRole


def customer_payload(**overrides) -> dict:
    return {
        "name": "John Doe",
        "username": "johndoe",
        "email": "john@example.com",
        "password": "Secure123",
        "role_type": "customer",
        **overrides,
    }


def worker_payload(**overrides) -> dict:
    return {
        "name": "Jane Doe",
        "username": "janedoe",
        "email": "jane@example.com",
        "password": "Secure123",
        "role_type": "worker",
        **overrides,
    }


def login_payload(**overrides) -> dict:
    return {
        "username_or_email": "johndoe",
        "password": "Secure123",
        **overrides,
    }

async def create_valid_refresh_token(
    username: str = "johndoe",
    email: str = "john@example.com",
    role: str = UserRole.CUSTOMER.value,
    token_version: int = 1,
    expires_delta: timedelta | None = None,
) -> str:
    """Generates a valid signed JWT refresh token for testing."""
    payload: dict[str, Any] = {
        "sub": username,
        "email": email,
        "role": role,
        "tv": token_version,
    }
    return await create_refresh_token(data=payload, expires_delta=expires_delta)


async def create_expired_refresh_token(
    username: str = "johndoe",
    email: str = "john@example.com",
    role: str = UserRole.CUSTOMER.value,
    token_version: int = 1,
) -> str:
    """Generates a signed JWT refresh token that is already expired."""
    payload: dict[str, Any] = {
        "sub": username,
        "email": email,
        "role": role,
        "tv": token_version,
    }
    # Pass a negative timedelta so 'exp' is in the past
    return await create_refresh_token(data=payload, expires_delta=timedelta(minutes=-10))