from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import Any

logger = logging.getLogger(__name__)

# subscribers: event_name -> list of async callbacks
_subscribers: dict[str, list[Callable[..., Awaitable[None]]]] = {}


def subscribe(event: str, handler: Callable[..., Awaitable[None]]) -> None:
    """ Register an async handler for an event"""
    _subscribers.setdefault(event, []).append(handler)


async def publish(event: str, payload: dict[str, Any]) -> None:
    """ Fire all handlers for the given event. Errors are logged, not raised. """
    handlers = _subscribers.get(event, [])
    for handler in handlers:
        try:
            await handler(payload)
        except Exception as e:
            logger.error(f"Event handler error in {event}: {e}")
