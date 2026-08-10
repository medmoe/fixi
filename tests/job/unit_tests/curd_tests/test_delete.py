from datetime import datetime, UTC
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.exceptions.http_exceptions import NotFoundException, ForbiddenException
from src.app.crud.crud_jobs import crud_jobs
from src.app.models import User, Job


def create_job_instance(user_id: int, trade_category_id: int, **kwargs) -> Job:
    return Job(
        title="Test job",
        description="description",
        user_id=user_id,
        trade_category_id=trade_category_id,
        budget_min=Decimal(100),
        budget_max=Decimal(200),
        **kwargs
    )


@pytest.mark.unit
class TestJobDelete:
    async def test_delete_job_successful(self, async_session: AsyncSession, customer_test_user: User, test_job: Job):
        await crud_jobs.delete_job(db=async_session, user_id=customer_test_user.id, job_id=test_job.id)
        job = await async_session.get(Job, test_job.id)
        assert job is not None
        assert job.is_deleted is True
        assert job.deleted_at is not None

    async def test_delete_job_not_found_raises(self, async_session: AsyncSession, customer_test_user: User):
        with pytest.raises(NotFoundException):
            await crud_jobs.delete_job(db=async_session, user_id=customer_test_user.id, job_id=9999)

    async def test_delete_job_already_deleted_raises(self, async_session: AsyncSession, customer_test_user: User, test_job: Job):
        await crud_jobs.delete_job(db=async_session, user_id=customer_test_user.id, job_id=test_job.id)
        with pytest.raises(NotFoundException):
            await crud_jobs.delete_job(db=async_session, user_id=customer_test_user.id, job_id=test_job.id)

    async def test_delete_job_wrong_user_raises(self, async_session: AsyncSession, customer_test_user: User, other_user: User, test_job: Job):
        with pytest.raises(ForbiddenException):
            await crud_jobs.delete_job(db=async_session, user_id=other_user.id, job_id=test_job.id)

    async def test_delete_job_sets_deleted_at_timestamp(self, async_session: AsyncSession, customer_test_user: User, test_job: Job):
        before = datetime.now(UTC).replace(tzinfo=None)
        await crud_jobs.delete_job(db=async_session, user_id=customer_test_user.id, job_id=test_job.id)
        after = datetime.now(UTC).replace(tzinfo=None)
        job = await async_session.get(Job, test_job.id)
        assert job is not None
        assert before <= job.deleted_at <= after

    async def test_delete_job_sets_updated_at_timestamp(self, async_session: AsyncSession, customer_test_user: User, test_job: Job):
        before = datetime.now(UTC).replace(tzinfo=None)
        await crud_jobs.delete_job(db=async_session, user_id=customer_test_user.id, job_id=test_job.id)
        after = datetime.now(UTC).replace(tzinfo=None)
        job = await async_session.get(Job, test_job.id)
        assert job is not None
        assert before <= job.updated_at <= after
