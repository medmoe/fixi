from typing import Any

TEST_CLIENT_IP = "127.0.0.1"

class FakeRateLimiter:
    """ In-memory rate limiter for testing — no Redis needed. """

    def __init__(self, limit: int = 10):
        self.counts: dict[str, int] = {}
        self.limit = limit

    async def is_rate_limited(
            self,
            db: Any,
            user_id: int | str,  # accepts both int (authenticated) and str (IP address)
            path: str,
            limit: int,
            period: int
    ) -> bool:
        key = f"{user_id}:{path}"
        self.counts[key] = self.counts.get(key, 0) + 1
        return self.counts[key] > self.limit

    def reset(self) -> None:
        self.counts.clear()

    def set_count(
            self,
            path: str,
            count: int,
            user_id: int | str | None = None,  # optional — defaults to IP
            ip: str = TEST_CLIENT_IP,  # httpx default client IP
    ) -> None:
        """ Helper to pre-set a count for testing limit enforcement."""
        identifier = str(user_id) if user_id is not None else ip
        key = f"{identifier}:{path}"
        self.counts[key] = count
