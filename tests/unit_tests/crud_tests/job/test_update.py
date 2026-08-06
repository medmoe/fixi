from datetime import datetime, UTC
from decimal import Decimal

import pytest
from fastcrud.exceptions.http_exceptions import BadRequestException
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.exceptions.http_exceptions import NotFoundException, ForbiddenException
from src.app.crud.crud_jobs import crud_jobs
from src.app.models import User, Job, TradeCategory, JobStatus
from src.app.schemas.job import JobUpdate, JobRead


def create_job_update_payload(**overrides):
    return {
        "title": "Updated title",
        "description": "Updated description",
        **overrides
    }


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
class TestJobUpdate:
    async def test_update_job_successful(self, async_session: AsyncSession, test_user: User, test_job: Job):
        payload = create_job_update_payload()
        updated_job = await crud_jobs.update_job(
            db=async_session,
            object=JobUpdate(**payload),
            user_id=test_user.id,
            job_id=test_job.id
        )
        assert updated_job is not None
        assert updated_job.title == payload['title']
        assert updated_job.description == payload['description']

    async def test_update_job_not_found_raises(self, async_session: AsyncSession, test_user: User):
        payload = create_job_update_payload()
        not_existed_job_id = 9999
        with pytest.raises(NotFoundException, match=f"Job with id {not_existed_job_id} not found"):
            await crud_jobs.update_job(db=async_session, object=JobUpdate(**payload), user_id=test_user.id, job_id=not_existed_job_id)

    async def test_update_job_wrong_user_raises(self, async_session: AsyncSession, other_user: User, test_job: Job):
        payload = create_job_update_payload()
        with pytest.raises(ForbiddenException):
            await crud_jobs.update_job(db=async_session, object=JobUpdate(**payload), user_id=other_user.id, job_id=test_job.id)

    async def test_update_job_deleted_raises(self, async_session: AsyncSession, test_user: User, test_job: Job, test_trade_category: TradeCategory):
        # create a job with delete status
        job = create_job_instance(user_id=test_user.id, trade_category_id=test_trade_category.id)
        job.is_deleted = True
        async_session.add(job)
        await async_session.commit()
        await async_session.refresh(job)

        payload = create_job_update_payload()
        with pytest.raises(NotFoundException, match=f"Job with id {job.id} has been deleted"):
            await crud_jobs.update_job(db=async_session, object=JobUpdate(**payload), user_id=test_user.id, job_id=job.id)

    async def test_update_job_in_progress_status_raises(self, async_session: AsyncSession, test_user: User, test_job: Job, test_trade_category: TradeCategory):
        await help_test_update_job_with_given_status(
            async_session=async_session,
            user_id=test_user.id,
            trade_category_id=test_trade_category.id,
            status=JobStatus.IN_PROGRESS,
            exception=BadRequestException
        )

    async def test_update_job_assigned_status_raises(self, async_session: AsyncSession, test_user: User, test_job: Job, test_trade_category: TradeCategory):
        await help_test_update_job_with_given_status(
            async_session=async_session,
            user_id=test_user.id,
            trade_category_id=test_trade_category.id,
            status=JobStatus.ASSIGNED,
            exception=BadRequestException
        )

    async def test_update_job_cancelled_status_raises(self, async_session: AsyncSession, test_user: User, test_job: Job, test_trade_category: TradeCategory):
        await help_test_update_job_with_given_status(
            async_session=async_session,
            user_id=test_user.id,
            trade_category_id=test_trade_category.id,
            status=JobStatus.CANCELLED,
            exception=BadRequestException
        )

    async def test_update_job_completed_status_raises(self, async_session: AsyncSession, test_user: User, test_job: Job, test_trade_category: TradeCategory):
        await help_test_update_job_with_given_status(
            async_session=async_session,
            user_id=test_user.id,
            trade_category_id=test_trade_category.id,
            status=JobStatus.COMPLETED,
            exception=BadRequestException
        )

    async def test_update_job_sets_updated_at_timestamp(self, async_session: AsyncSession, test_user: User, test_job: Job):
        payload = create_job_update_payload()
        before = datetime.now(UTC)
        updated_job = await crud_jobs.update_job(db=async_session, object=JobUpdate(**payload), user_id=test_user.id, job_id=test_job.id)
        after = datetime.now(UTC)
        assert updated_job is not None
        assert updated_job.updated_at is not None
        assert before <= updated_job.updated_at <= after

    async def test_update_job_returns_job_read_model(self, async_session: AsyncSession, test_user: User, test_job: Job):
        payload = create_job_update_payload()
        updated_job = await crud_jobs.update_job(db=async_session, object=JobUpdate(**payload), user_id=test_user.id, job_id=test_job.id)
        assert isinstance(updated_job, JobRead)

    async def test_update_job_preserves_unset_fields(self, async_session: AsyncSession, test_user: User, test_job: Job):
        payload = create_job_update_payload()
        updated_job = await crud_jobs.update_job(db=async_session, object=JobUpdate(**payload), user_id=test_user.id, job_id=test_job.id)
        # set fields
        assert updated_job != test_job.title
        assert updated_job != test_job.description

        # unset fields
        assert updated_job.budget_max == test_job.budget_max
        assert updated_job.budget_min == test_job.budget_min


# ——————— Helpers ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
async def help_test_update_job_with_given_status(
        async_session: AsyncSession,
        user_id: int,
        trade_category_id: int,
        status: JobStatus,
        exception,
        message: str | None = None):
    job = create_job_instance(user_id=user_id, trade_category_id=trade_category_id)
    job.status = status
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)

    payload = create_job_update_payload()
    with pytest.raises(exception, match=message):
        await crud_jobs.update_job(db=async_session, object=JobUpdate(**payload), user_id=user_id, job_id=job.id)
