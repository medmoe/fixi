from decimal import Decimal

import pytest
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.exceptions.http_exceptions import BadRequestException
from src.app.crud.crud_jobs import crud_jobs
from src.app.models import Job, JobStatus, User, TradeCategory
from src.app.schemas.job import JobCreate
from tests.job.helpers import bulk_job_create
from tests.job.mocks import mock_jobs


@pytest.mark.unit
class TestJobCreate:
    async def test_create_job_successful(self, async_session: AsyncSession, test_user: User):
        job_schema = mock_jobs[0]
        created_job = await crud_jobs.create_job(db=async_session, object=JobCreate(**job_schema), user_id=test_user.id)
        assert created_job is not None
        assert created_job.user_id == test_user.id
        assert created_job.title == job_schema["title"]
        assert created_job.description == job_schema["description"]
        assert created_job.budget_min == job_schema["budget_min"]
        assert created_job.budget_max == job_schema["budget_max"]
        assert created_job.display_location == job_schema["display_location"]
        assert created_job.location is not None

    async def test_create_job_at_limit_raises(self, async_session: AsyncSession, test_user: User):
        jobs = [{**job, "user_id": test_user.id} for job in mock_jobs[:10]]
        await bulk_job_create(db=async_session, parameters=jobs)
        with pytest.raises(BadRequestException):
            await crud_jobs.create_job(db=async_session, object=JobCreate(**mock_jobs[9]), user_id=test_user.id)

    async def test_create_job_over_limit_raises(self, async_session: AsyncSession, test_user: User):
        jobs = [{**job, "user_id": test_user.id} for job in mock_jobs[:11]]
        await bulk_job_create(db=async_session, parameters=jobs)
        with pytest.raises(BadRequestException):
            await crud_jobs.create_job(db=async_session, object=JobCreate(**mock_jobs[10]), user_id=test_user.id)

    async def test_create_job_one_under_limit_succeeds(self, async_session: AsyncSession, test_user: User):
        jobs = [{**job, "user_id": test_user.id} for job in mock_jobs[:9]]
        await bulk_job_create(db=async_session, parameters=jobs)
        created_job = await crud_jobs.create_job(db=async_session, object=JobCreate(**mock_jobs[8]), user_id=test_user.id)
        assert created_job is not None

    async def test_create_job_excludes_unset_fields(self, async_session: AsyncSession, test_user: User):
        job_schema = mock_jobs[0]
        del job_schema["description"]
        del job_schema["budget_min"]
        created_job = await crud_jobs.create_job(db=async_session, object=JobCreate(**job_schema), user_id=test_user.id)
        assert created_job is not None
        assert created_job.description is None
        assert created_job.budget_min is None


    async def test_create_job_counts_only_open_in_progress_assigned(
            self,
            async_session: AsyncSession,
            test_user: User,
            test_trade_category: TradeCategory
    ):
        """
        Active limit of 10 counts only OPEN, IN_PROGRESS, ASSIGNED jobs.
        COMPLETED and CANCELLED jobs are excluded from the count.
        A customer with 9 actives and any number of completed/canceled
        can still create one more job.
        """

        # ─── Arrange — create jobs with specific statuses ─────────────────────

        async def create_jobs_with_status(status: JobStatus, count: int) -> None:
            """Helper — create N jobs and set their status directly."""
            for i in range(count):
                job = Job(
                    title=f"Job {status.value} {i}",
                    user_id=test_user.id,
                    status=status,
                    description="Test job description",
                    budget_min=Decimal(100),
                    budget_max=Decimal(200),
                    trade_category_id=test_trade_category.id
                )
                async_session.add(job)
            await async_session.flush()

        # 9 active jobs (3 of each active status) — one slot remaining
        await create_jobs_with_status(JobStatus.OPEN, 3)
        await create_jobs_with_status(JobStatus.IN_PROGRESS, 3)
        await create_jobs_with_status(JobStatus.ASSIGNED, 3)

        # non-active jobs — should NOT count toward limit
        await create_jobs_with_status(JobStatus.COMPLETED, 5)
        await create_jobs_with_status(JobStatus.CANCELLED, 5)
        await async_session.commit()

        # ─── Act — try to create one more active job ──────────────────────────
        result = await crud_jobs.create_job(
            db=async_session,
            object=JobCreate(**mock_jobs[0]),
            user_id=test_user.id,
        )

        # ─── Assert — creation succeeds (9 active + 1 new = 10) ──────────────
        assert result is not None
        assert result.title == mock_jobs[0]['title']

        # verify active count is exactly 10
        active_count_result = await async_session.execute(
            select(func.count(Job.id)).where(
                Job.user_id == test_user.id,
                Job.status.in_([
                    JobStatus.OPEN.value,
                    JobStatus.IN_PROGRESS.value,
                    JobStatus.ASSIGNED.value,
                ]),
                Job.is_deleted == False,
            )
        )
        assert active_count_result.scalar() == 10

    async def test_create_job_limit_ignores_completed_cancelled(
            self,
            async_session: AsyncSession,
            test_user: User,
            test_trade_category: TradeCategory,
    ):
        """
        Even with many completed/cancelled jobs, limit is not affected.
        """

        async def create_jobs_with_status(status: JobStatus, count: int) -> None:
            for i in range(count):
                async_session.add(Job(
                    title=f"Job {i}",
                    user_id=test_user.id,
                    status=status,
                    description=f"Job {i} description",
                    budget_min=Decimal(100),
                    budget_max=Decimal(200),
                    trade_category_id=test_trade_category.id,
                ))
            await async_session.flush()

        # 10 completed + 10 cancelled — should not count
        await create_jobs_with_status(JobStatus.COMPLETED, 10)
        await create_jobs_with_status(JobStatus.CANCELLED, 10)
        await async_session.commit()

        # creating 10 active jobs should still succeed
        for job_schema in mock_jobs[:10]:
            result = await crud_jobs.create_job(
                db=async_session,
                object=JobCreate(**job_schema),
                user_id=test_user.id,
            )
            assert result is not None

        # 11th active job should fail
        with pytest.raises(BadRequestException, match="Maximum number of active jobs reached"):
            await crud_jobs.create_job(
                db=async_session,
                object=JobCreate(**mock_jobs[10]),
                user_id=test_user.id,
            )

    async def test_create_job_count_excludes_deleted(self, async_session: AsyncSession, test_user: User, test_trade_category: TradeCategory):
        async def create_job(count: int, is_deleted: bool = False) -> None:
            for _ in range(count):
                job = Job(
                    title="Test Job",
                    user_id=test_user.id,
                    description="Test Job Description",
                    budget_min=Decimal(100),
                    budget_max=Decimal(200),
                    trade_category_id=test_trade_category.id,
                )
                job.is_deleted = is_deleted
                async_session.add(job)
            await async_session.flush()

        # 9 active jobs, and 1 deleted job
        await create_job(9)
        await create_job(1, is_deleted=True)
        await async_session.commit()

        # Creating another job should succeed
        created_job = await crud_jobs.create_job(db=async_session, object=JobCreate(**mock_jobs[0]), user_id=test_user.id)
        assert created_job is not None

    async def test_create_job_returns_job_read_model(self, async_session: AsyncSession, test_user: User, test_trade_category: TradeCategory):

        created_job = await crud_jobs.create_job(db=async_session, object=JobCreate(**mock_jobs[1], trade_category_id=test_trade_category.id), user_id=test_user.id)
        assert created_job is not None
        assert created_job.id is not None
        assert created_job.title == mock_jobs[1]["title"]
        assert created_job.description == mock_jobs[1]["description"]
        assert created_job.budget_min == mock_jobs[1]["budget_min"]
        assert created_job.budget_max == mock_jobs[1]["budget_max"]
        assert created_job.uuid is not None
        assert created_job.location is not None and created_job.location.startswith("POINT")
        assert created_job.status == JobStatus.OPEN.value
        assert created_job.user_id == test_user.id
        assert created_job.created_at is not None
        assert created_job.updated_at is not None
        assert created_job.deleted_at is None
        assert created_job.is_deleted is False
        assert created_job.trade_category is None