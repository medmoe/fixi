import pytest

from src.app.models.job import Job, JobStatus
from src.app.models.user import User, UserRole


class TestGeospatialEndpoints:
    @pytest.mark.asyncio
    async def test_workers_nearby_returns_handymen_within_radius(self, async_client, async_session):
        handyman_near = User(
            name="Near Handyman",
            username="nearhandyman",
            email="near.handyman@example.com",
            hashed_password="hashed_password",
            role_type=UserRole.worker,
            location="POINT(13.4050 52.5200)",
        )
        handyman_far = User(
            name="Far Handyman",
            username="farhandyman",
            email="far.handyman@example.com",
            hashed_password="hashed_password",
            role_type=UserRole.worker,
            location="POINT(2.3522 48.8566)",
        )
        async_session.add(handyman_near)
        async_session.add(handyman_far)
        await async_session.commit()

        response = await async_client.get(
            "/api/v1/workers/nearby",
            params={"latitude": 52.5200, "longitude": 13.4050, "radius_km": 10, "limit": 10},
        )
        assert response.status_code == 200
        data = response.json()
        usernames = {row["username"] for row in data}
        assert "nearhandyman" in usernames
        assert "farhandyman" not in usernames

    @pytest.mark.asyncio
    async def test_jobs_nearby_returns_open_jobs_for_customer_locations(self, async_client, async_session, auth_headers):
        customer = User(
            name="Geo Customer",
            username="geocustomer",
            email="geo.customer@example.com",
            hashed_password="hashed_password",
            role_type=UserRole.customer,
            location="POINT(13.4050 52.5200)",
        )
        worker = User(
            name="Geo Worker",
            username="geoworker",
            email="geo.worker@example.com",
            hashed_password="hashed_password",
            role_type=UserRole.worker,
            location="POINT(13.4100 52.5200)",
        )
        async_session.add(customer)
        async_session.add(worker)
        await async_session.commit()
        await async_session.refresh(customer)
        await async_session.refresh(worker)

        job = Job(
            customer_id=customer.id,
            worker_id=worker.id,
            title="Nearby sink fix",
            description="Need quick kitchen sink repair",
            status=JobStatus.OPEN,
        )
        async_session.add(job)
        await async_session.commit()

        response = await async_client.get(
            "/api/v1/jobs/nearby",
            params={"latitude": 52.5200, "longitude": 13.4050, "radius_km": 10, "status": "open"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert any(item["title"] == "Nearby sink fix" for item in data)
