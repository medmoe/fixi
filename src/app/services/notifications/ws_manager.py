from __future__ import annotations

from typing import Any

from fastapi import WebSocket

from ...core.logger import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Tracks active notification WebSocket connections per user, in-memory
    and per-process. A user can hold several connections at once (multiple
    tabs/devices). This is process-local -- fine for a single uvicorn
    worker; a multi-worker deployment would need a shared broker (e.g.
    Redis pub/sub) fanning out to each worker's manager instead."""

    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        connections = self._connections.get(user_id)
        if not connections:
            return
        connections.discard(websocket)
        if not connections:
            self._connections.pop(user_id, None)

    async def send_to_user(self, user_id: int, message: dict[str, Any]) -> None:
        connections = self._connections.get(user_id)
        if not connections:
            return
        stale: list[WebSocket] = []
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception as exc:
                logger.warning("Dropping stale notification WS connection for user %s: %s", user_id, exc)
                stale.append(ws)
        for ws in stale:
            self.disconnect(user_id, ws)


connection_manager = ConnectionManager()
