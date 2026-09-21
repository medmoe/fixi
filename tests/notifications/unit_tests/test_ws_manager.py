import pytest

from src.app.services.notifications.ws_manager import ConnectionManager


class FakeWebSocket:
    """Minimal stand-in for FastAPI's WebSocket -- just enough surface for
    ConnectionManager: accept()/send_json(), with a way to simulate a dead
    connection."""

    def __init__(self, fail_send: bool = False) -> None:
        self.accepted = False
        self.sent: list[dict] = []
        self._fail_send = fail_send

    async def accept(self) -> None:
        self.accepted = True

    async def send_json(self, message: dict) -> None:
        if self._fail_send:
            raise RuntimeError("connection closed")
        self.sent.append(message)


@pytest.mark.unit
class TestConnectionManager:
    async def test_connect_accepts_and_registers_the_socket(self):
        manager = ConnectionManager()
        ws = FakeWebSocket()

        await manager.connect(1, ws)

        assert ws.accepted is True
        assert ws in manager._connections[1]

    async def test_send_to_user_delivers_to_every_open_connection_for_that_user(self):
        manager = ConnectionManager()
        ws1, ws2 = FakeWebSocket(), FakeWebSocket()
        await manager.connect(1, ws1)
        await manager.connect(1, ws2)

        await manager.send_to_user(1, {"type": "notification", "data": {"id": 1}})

        assert ws1.sent == [{"type": "notification", "data": {"id": 1}}]
        assert ws2.sent == [{"type": "notification", "data": {"id": 1}}]

    async def test_send_to_user_does_not_deliver_to_a_different_user(self):
        manager = ConnectionManager()
        ws = FakeWebSocket()
        await manager.connect(1, ws)

        await manager.send_to_user(2, {"type": "notification", "data": {}})

        assert ws.sent == []

    async def test_send_to_user_with_no_connections_is_a_no_op(self):
        manager = ConnectionManager()
        # Should not raise even though user 1 has never connected.
        await manager.send_to_user(1, {"type": "notification", "data": {}})

    async def test_disconnect_removes_the_socket(self):
        manager = ConnectionManager()
        ws = FakeWebSocket()
        await manager.connect(1, ws)

        manager.disconnect(1, ws)

        assert 1 not in manager._connections

    async def test_disconnect_is_safe_to_call_twice(self):
        manager = ConnectionManager()
        ws = FakeWebSocket()
        await manager.connect(1, ws)

        manager.disconnect(1, ws)
        manager.disconnect(1, ws)  # should not raise

        assert 1 not in manager._connections

    async def test_disconnect_for_unknown_user_is_a_no_op(self):
        manager = ConnectionManager()
        ws = FakeWebSocket()
        # Never connected -- should not raise.
        manager.disconnect(999, ws)

    async def test_a_failed_send_drops_the_stale_connection_but_not_others(self):
        manager = ConnectionManager()
        dead, alive = FakeWebSocket(fail_send=True), FakeWebSocket()
        await manager.connect(1, dead)
        await manager.connect(1, alive)

        await manager.send_to_user(1, {"type": "notification", "data": {}})

        assert dead not in manager._connections.get(1, set())
        assert alive in manager._connections[1]
        assert alive.sent == [{"type": "notification", "data": {}}]
