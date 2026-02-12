import pytest
from faker import Faker
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models.service_category import ServiceCategory
from src.app.models.user import User
from src.app.models.user import UserRole
from src.app.models.worker import Worker
from src.app.core.security import get_password_hash

faker = Faker()


@pytest.mark.integration
class TestWorkerEndpoints:
    """Integration tests for worker endpoints."""

    async def test_create_worker_profile_success(
            self,
            async_client: AsyncClient,
            auth_headers: dict,
            test_user: User,
    ):
        """Test creating a worker profile successfully."""
        worker_data = {
            "user_id": test_user.id,
            "profession": "Plumber",
            "hourly_rate": 75.0,
            "years_of_experience": 10,
            "bio": "Experienced plumber with residential and commercial experience",
            "availability_status": "available",
        }

        response = await async_client.post(
            "/api/v1/worker",
            json=worker_data,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == test_user.id
        assert data["profession"] == "Plumber"
        assert data["hourly_rate"] == 75.0
        assert data["is_verified"] is False
        assert "id" in data

    async def test_create_worker_profile_duplicate(
            self,
            async_client: AsyncClient,
            auth_headers: dict,
            test_user: User,
    ):
        """Test creating duplicate worker profile fails."""
        worker_data = {
            "user_id": test_user.id,
            "profession": "Carpenter",
            "hourly_rate": 60.0,
        }

        # Create first profile
        response1 = await async_client.post(
            "/api/v1/worker",
            json=worker_data,
            headers=auth_headers,
        )
        assert response1.status_code == 201

        # Try to create second profile
        response2 = await async_client.post(
            "/api/v1/worker",
            json=worker_data,
            headers=auth_headers,
        )
        assert response2.status_code == 422
        assert "worker profile already exists for this user" in response2.json()["detail"].lower()

    async def test_create_worker_profile_for_another_user_forbidden(
            self,
            async_client: AsyncClient,
            auth_headers: dict,
            other_user: User,
    ):
        """Test creating worker profile for another user is forbidden."""
        worker_data = {
            "user_id": other_user.id,
            "profession": "Electrician",
            "hourly_rate": 85.0,
        }

        response = await async_client.post(
            "/api/v1/worker",
            json=worker_data,
            headers=auth_headers,
        )

        assert response.status_code == 403

    async def test_create_worker_profile_unauthenticated(
            self,
            async_client: AsyncClient,
            test_user: User,
    ):
        """Test creating worker profile without authentication fails."""
        worker_data = {
            "user_id": test_user.id,
            "profession": "Plumber",
            "hourly_rate": 75.0,
        }

        response = await async_client.post(
            "/api/v1/worker",
            json=worker_data,
        )

        assert response.status_code == 401

    async def test_get_workers_list(
            self,
            async_client: AsyncClient,
            auth_headers: dict,
            async_session: AsyncSession
    ):
        """Test getting list of workers."""
        await self.create_some_workers(async_session)

        response = await async_client.get("/api/v1/workers", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total_count" in data
        assert data["total_count"] >= 1
        assert len(data["data"]) >= 1

    async def test_get_workers_list_filtered_by_profession(
            self,
            async_client: AsyncClient,
            async_session: AsyncSession,
    ):
        """Test getting workers filtered by profession."""

        await self.create_some_workers(async_session, profession="Plumber")

        response = await async_client.get(
            "/api/v1/workers",
            params={"profession": "Plumber"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_count"] >= 1
        for worker in data["data"]:
            assert worker["profession"] == "Plumber"

    async def test_get_workers_list_verified_only(
            self,
            async_client: AsyncClient,
            async_session: AsyncSession,

    ):
        """Test getting only verified workers."""

        await self.create_some_workers(async_session)

        response = await async_client.get(
            "/api/v1/workers",
            params={"verified_only": True},
        )

        assert response.status_code == 200
        data = response.json()
        for worker in data["data"]:
            assert worker["is_verified"] is True

    async def test_get_workers_list_pagination(
            self,
            async_client: AsyncClient,
            async_session: AsyncSession,
    ):
        """Test workers list pagination."""

        await self.create_some_workers(async_session, workers_count=10)

        response = await async_client.get(
            "/api/v1/workers",
            params={"page": 1, "items_per_page": 5},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) <= 5

    async def test_get_categories(self, async_client: AsyncClient, admin_auth_headers: dict, async_session: AsyncSession):
        category = ServiceCategory(name="Electrical", description="Electrical repairs")
        async_session.add(category)
        await async_session.commit()

        response = await async_client.get("/api/v1/categories", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert any(item["name"] == "Electrical" for item in data)

    async def test_put_worker_profile(self, async_client: AsyncClient, async_session: AsyncSession):
        worker_user = User(
            name="Worker Profile User",
            username="workerprofileuser",
            email="worker.profile@example.com",
            hashed_password=get_password_hash("testpassword123"),
            role_type=UserRole.HANDYMAN,
        )
        category = ServiceCategory(name="Painting", description="Painting services")
        async_session.add(worker_user)
        async_session.add(category)
        await async_session.commit()
        await async_session.refresh(worker_user)
        await async_session.refresh(category)

        login_data = {"username": worker_user.username, "password": "testpassword123"}
        login_response = await async_client.post("/api/v1/login", data=login_data)
        headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

        response = await async_client.put(
            "/api/v1/worker/profile",
            json={
                "service_category_id": category.id,
                "profession": "Painter",
                "hourly_rate": 55.0,
                "skills": ["interior", "exterior"],
                "portfolio_image_urls": ["https://cdn.example.com/portfolio/1.jpg"],
            },
            headers=headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["service_category_id"] == category.id
        assert data["hourly_rate"] == 55.0
        assert "interior" in data["skills"]

    async def test_get_workers_by_category_and_proximity(self, async_client: AsyncClient, async_session: AsyncSession):
        category = ServiceCategory(name="PlumbingX", description="Plumbing")
        async_session.add(category)
        await async_session.commit()
        await async_session.refresh(category)

        near_user = User(
            name="Near Worker",
            username="nearworker1",
            email="near.worker1@example.com",
            hashed_password="hashed",
            role_type=UserRole.HANDYMAN,
            location="POINT(13.4050 52.5200)",
        )
        far_user = User(
            name="Far Worker",
            username="farworker1",
            email="far.worker1@example.com",
            hashed_password="hashed",
            role_type=UserRole.HANDYMAN,
            location="POINT(2.3522 48.8566)",
        )
        async_session.add(near_user)
        async_session.add(far_user)
        await async_session.commit()
        await async_session.refresh(near_user)
        await async_session.refresh(far_user)

        async_session.add(
            Worker(user_id=near_user.id, profession="Plumber", hourly_rate=80.0, service_category_id=category.id)
        )
        async_session.add(
            Worker(user_id=far_user.id, profession="Plumber", hourly_rate=80.0, service_category_id=category.id)
        )
        await async_session.commit()

        response = await async_client.get(
            "/api/v1/workers",
            params={"category": category.id, "lat": 52.5200, "long": 13.4050, "radius_km": 20},
        )
        assert response.status_code == 200
        data = response.json()
        assert any(item["id"] for item in data["data"])
        usernames_nearby = []
        for item in data["data"]:
            if item.get("distance_km") is not None and item["distance_km"] <= 20:
                usernames_nearby.append(item["id"])
        assert len(usernames_nearby) >= 1

    async def test_get_worker_by_id(
            self,
            async_client: AsyncClient,
            async_session: AsyncSession,
            test_worker: Worker
    ):
        """Test getting a specific worker by ID."""
        response = await async_client.get(f"/api/v1/worker/{test_worker.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_worker.id
        assert data["profession"] == test_worker.profession

    async def test_get_worker_by_id_not_found(
            self,
            async_client: AsyncClient,
    ):
        """Test getting non-existent worker returns 404."""
        response = await async_client.get("/api/v1/worker/99999")

        assert response.status_code == 404

    async def test_get_my_worker_profile(
            self,
            async_client: AsyncClient,
            auth_headers: dict,
            test_user: User,
            async_session: AsyncSession,

    ):
        """Test getting current user's worker profile."""
        worker = Worker(user_id=test_user.id, profession="Plumber", hourly_rate=75.0)
        async_session.add(worker)
        await async_session.commit()

        response = await async_client.get(
            "/api/v1/worker/me",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == worker.id

    async def test_get_my_worker_profile_not_found(
            self,
            async_client: AsyncClient,
            auth_headers: dict,
    ):
        """Test getting worker profile when user has none."""
        response = await async_client.get(
            "/api/v1/worker/me",
            headers=auth_headers,
        )

        assert response.status_code == 404

    async def test_update_worker_profile_success(
            self,
            async_client: AsyncClient,
            auth_headers: dict,
            test_user: User,
            async_session: AsyncSession,
    ):
        """Test updating worker profile successfully."""
        update_data = {
            "hourly_rate": 90.0,
            "availability_status": "busy",
            "bio": "Updated bio",
        }

        worker = Worker(user_id=test_user.id, profession="Plumber", hourly_rate=75.0, availability_status="available", bio="Old bio")
        async_session.add(worker)
        await async_session.commit()

        response = await async_client.patch(
            f"/api/v1/worker/{worker.id}",
            json=update_data,
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert "updated" in response.json()["message"].lower()

        # Verify update
        verify_response = await async_client.get(
            f"/api/v1/worker/{worker.id}"
        )
        data = verify_response.json()
        assert data["hourly_rate"] == 90.0
        assert data["availability_status"] == "busy"

    async def test_update_worker_profile_forbidden(
            self,
            async_client: AsyncClient,
            auth_headers: dict,
            test_worker: Worker,
    ):
        """Test updating another user's worker profile is forbidden."""
        update_data = {"hourly_rate": 100.0}

        response = await async_client.patch(
            f"/api/v1/worker/{test_worker.id}",
            json=update_data,
            headers=auth_headers,
        )

        assert response.status_code == 403

    async def test_verify_worker_as_admin(
            self,
            async_client: AsyncClient,
            admin_auth_headers: dict,
            async_session: AsyncSession,
            test_admin_user: User,
    ):
        """Test verifying worker as admin."""
        verification_data = {"is_verified": True}
        worker = Worker(user_id=test_admin_user.id, profession="Plumber", hourly_rate=75.0, is_verified=True)
        async_session.add(worker)
        await async_session.commit()

        response = await async_client.patch(
            f"/api/v1/worker/{worker.id}/verify",
            json=verification_data,
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        assert "verified" in response.json()["message"].lower()

        # Verify the change
        verify_response = await async_client.get(
            f"/api/v1/worker/{worker.id}"
        )
        assert verify_response.json()["is_verified"] is True

    async def test_verify_worker_as_regular_user_forbidden(
            self,
            async_client: AsyncClient,
            auth_headers: dict,
            test_worker: Worker,
    ):
        """Test that regular users cannot verify workers."""
        verification_data = {"is_verified": True}

        response = await async_client.patch(
            f"/api/v1/worker/{test_worker.id}/verify",
            json=verification_data,
            headers=auth_headers,
        )

        assert response.status_code == 403

    async def test_delete_worker_profile_success(
            self,
            async_client: AsyncClient,
            auth_headers: dict,
            test_user: User,
            async_session: AsyncSession,
    ):
        """Test deleting worker profile successfully."""
        test_worker = Worker(user_id=test_user.id, profession="Plumber", hourly_rate=75.0)
        async_session.add(test_worker)
        await async_session.commit()

        response = await async_client.delete(
            f"/api/v1/worker/{test_worker.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()

        # Verify deletion
        verify_response = await async_client.get(
            f"/api/v1/worker/{test_worker.id}"
        )
        assert verify_response.status_code == 404

    async def test_delete_worker_profile_forbidden(
            self,
            async_client: AsyncClient,
            other_auth_headers: dict,
            test_worker: Worker,
    ):
        """Test deleting another user's worker profile is forbidden."""
        response = await async_client.delete(
            f"/api/v1/worker/{test_worker.id}",
            headers=other_auth_headers,
        )

        assert response.status_code == 403

    async def test_db_delete_worker_as_admin(
            self,
            async_client: AsyncClient,
            admin_auth_headers: dict,
            test_worker: Worker,
    ):
        """Test permanently deleting worker as admin."""
        response = await async_client.delete(
            f"/api/v1/db_worker/{test_worker.id}",
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        assert "permanently deleted" in response.json()["message"].lower()

    async def test_get_professions_list(
            self,
            async_client: AsyncClient,
            test_worker: Worker,
    ):
        """Test getting list of professions."""
        response = await async_client.get("/api/v1/professions")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert test_worker.profession in data

    async def create_some_workers(self, async_session: AsyncSession, workers_count: int = 10, profession: str = "Plumber"):
        for i in range(workers_count):
            user = User(username=f"worker{i}", email=f"{i}test@test.com", hashed_password="hashed", name=f"{i} Worker")
            async_session.add(user)
            await async_session.commit()
            await async_session.refresh(user)
            worker = Worker(user_id=user.id, profession=faker.job() if i % 2 == 0 else profession, hourly_rate=75.0, is_verified=i % 2 == 0)
            async_session.add(worker)
            await async_session.commit()
