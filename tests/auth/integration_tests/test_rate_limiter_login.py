from httpx import AsyncClient
from redis import Redis

from tests.helpers.fakes import FakeRateLimiter


class TestLoginRateLimit:
    async def test_login_allowed_under_limit(
            self,
            async_client_with_rate_limit: tuple[AsyncClient, FakeRateLimiter],
    ):
        client, limiter = async_client_with_rate_limit

        response = await client.post("/api/v1/auth/login", json={"username_or_email": "johndoe", "password": "Pass123456"})
        assert response.status_code in {200, 401}

    async def test_login_blocked_after_limit_exceeded(self, async_client_with_redis, ):
        client, redis_client = async_client_with_redis

        payload = {"username_or_email": "johndoe", "password": "Pass123456", }

        # Create the rate-limit key
        await client.post("/api/v1/auth/login", json=payload, )

        keys = await redis_client.keys("ratelimit:*")

        assert len(keys) == 1

        key = keys[0]

        # Set the counter above the limit
        await redis_client.set(key, 10)

        response = await client.post("/api/v1/auth/login", json=payload, )

        assert response.status_code == 429

    async def test_rate_limit_resets_after_window(self, async_client_with_redis: tuple[AsyncClient, Redis]):
        client, redis_client = async_client_with_redis

        payload = {"username_or_email": "johndoe", "password": "Pass123456", }

        # Trigger rate limiter and create Redis key
        response = await client.post("/api/v1/auth/login", json=payload, )

        keys = await redis_client.keys("ratelimit:*")
        assert len(keys) == 1

        key = keys[0]

        # Verify Redis expiration is configured
        ttl = await redis_client.ttl(key)
        assert ttl > 0

        # Simulate window expiration
        await redis_client.delete(key)

        response = await client.post("/api/v1/auth/login", json=payload, )
        # Request should no longer be rate limited

        assert response.status_code in {200, 401}
