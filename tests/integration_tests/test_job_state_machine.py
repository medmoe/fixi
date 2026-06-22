import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.security import get_password_hash
from src.app.models.job import Job, JobStatus
from src.app.models.user import User, UserRole


@pytest.mark.integration
class TestJobStateMachine:
    async def _create_user_and_login(
        self,
        async_client: AsyncClient,
        async_session: AsyncSession,
        username: str,
        email: str,
        role: UserRole,
    ) -> tuple[User, dict[str, str]]:
        user = User(
            name=username,
            username=username,
            email=email,
            hashed_password=get_password_hash("testpassword123"),
            role_type=role,
        )
        async_session.add(user)
        await async_session.commit()
        await async_session.refresh(user)

        login = await async_client.post("/api/v1/login", data={"username": username, "password": "testpassword123"})
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        return user, headers

    @pytest.mark.asyncio
    async def test_worker_can_accept_pending_open_job(self, async_client: AsyncClient, async_session: AsyncSession):
        customer, _ = await self._create_user_and_login(
            async_client, async_session, "customeraccept", "customer.accept@example.com", UserRole.customer
        )
        worker, worker_headers = await self._create_user_and_login(
            async_client, async_session, "workeraccept", "worker.accept@example.com", UserRole.worker
        )

        job = Job(
            customer_id=customer.id,
            title="Fix sink",
            description="Sink leaking",
            status=JobStatus.OPEN,
        )
        async_session.add(job)
        await async_session.commit()
        await async_session.refresh(job)

        response = await async_client.post(f"/api/v1/jobs/{job.id}/accept", headers=worker_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "assigned"
        assert data["worker_id"] == worker.id

    @pytest.mark.asyncio
    async def test_worker_can_complete_assigned_job(self, async_client: AsyncClient, async_session: AsyncSession):
        customer, _ = await self._create_user_and_login(
            async_client, async_session, "customercomplete", "customer.complete@example.com", UserRole.customer
        )
        worker, worker_headers = await self._create_user_and_login(
            async_client, async_session, "workercomplete", "worker.complete@example.com", UserRole.worker
        )

        job = Job(
            customer_id=customer.id,
            worker_id=worker.id,
            title="Paint wall",
            description="Need one room painted",
            status=JobStatus.ASSIGNED,
        )
        async_session.add(job)
        await async_session.commit()
        await async_session.refresh(job)

        response = await async_client.post(f"/api/v1/jobs/{job.id}/complete", headers=worker_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"

    @pytest.mark.asyncio
    async def test_customer_cannot_accept_or_complete_job(self, async_client: AsyncClient, async_session: AsyncSession):
        customer, customer_headers = await self._create_user_and_login(
            async_client, async_session, "customerforbidden", "customer.forbidden@example.com", UserRole.customer
        )

        job = Job(
            customer_id=customer.id,
            title="Door repair",
            description="Door hinge issue",
            status=JobStatus.OPEN,
        )
        async_session.add(job)
        await async_session.commit()
        await async_session.refresh(job)

        accept_response = await async_client.post(f"/api/v1/jobs/{job.id}/accept", headers=customer_headers)
        complete_response = await async_client.post(f"/api/v1/jobs/{job.id}/complete", headers=customer_headers)
        assert accept_response.status_code == 403
        assert complete_response.status_code == 403
