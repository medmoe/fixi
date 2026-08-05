# ———————— Fixtures and Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————
from decimal import Decimal

import pytest
from sqlalchemy import insert, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.exceptions.http_exceptions import BadRequestException
from src.app.crud.crud_jobs import crud_jobs
from src.app.models import Job, JobStatus, User, TradeCategory
from src.app.schemas.job import JobCreate
from tests.unit_tests.crud_tests.mocks import mock_jobs


async def bulk_job_create(db: AsyncSession, parameters: list[dict]) -> None:
    await db.execute(insert(Job), parameters)
    await db.commit()


# ———————— Create ————————————————————————————————————————————————————————————————————————————————————————————————————————
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

    async def test_create_job_count_excludes_deleted(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_create_job_count_excludes_closed_completed(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_create_job_returns_job_read_model(self, async_session: AsyncSession, test_user: User):
        pass


# ———————— Update ————————————————————————————————————————————————————————————————————————————————————————————————————————
@pytest.mark.unit
class TestJobUpdate:
    async def test_update_job_successful(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_update_job_not_found_raises(self, async_session: AsyncSession, test_user: User):
        pass

    async def test_update_job_wrong_user_raises(self, async_session: AsyncSession, test_user: User, other_user: User, test_job: Job):
        pass

    async def test_update_job_deleted_raises(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_update_job_in_progress_status_raises(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_update_job_assigned_status_raises(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_update_job_closed_status_raises(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_update_job_completed_status_raises(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_update_job_partial_fields_only(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_update_job_sets_updated_at_timestamp(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_update_job_returns_job_read_model(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_update_job_preserves_unset_fields(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_update_job_fetches_updated_record_after_save(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass


# ———————— Delete ————————————————————————————————————————————————————————————————————————————————————————————————————————
@pytest.mark.unit
class TestJobDelete:
    async def test_delete_job_successful(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_delete_job_not_found_raises(self, async_session: AsyncSession, test_user: User):
        pass

    async def test_delete_job_already_deleted_raises(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_delete_job_wrong_user_raises(self, async_session: AsyncSession, test_user: User, other_user: User, test_job: Job):
        pass

    async def test_delete_job_sets_is_deleted_true(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_delete_job_sets_deleted_at_timestamp(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_delete_job_sets_updated_at_timestamp(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_delete_job_commits_to_database(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_delete_job_is_soft_delete_not_hard_delete(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_delete_job_idempotent_raises_on_second_attempt(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass


# ———————— Get multi  ————————————————————————————————————————————————————————————————————————————————————————————————————————
@pytest.mark.unit
class TestJobGetMulti:
    async def test_get_multi_job_successful(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_get_multi_job_excludes_deleted_by_default(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_get_multi_job_filters_by_status(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_get_multi_job_filters_by_trade_category_id(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_get_multi_job_filters_by_user_id(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_get_multi_job_filters_by_min_budget(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_get_multi_job_filters_by_max_budget(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_get_multi_job_filters_by_budget_range(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_get_multi_job_search_matches_title(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_get_multi_job_search_matches_description(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_get_multi_job_search_is_case_insensitive(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_get_multi_job_search_with_pagination(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_get_multi_job_search_excludes_deleted(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_get_multi_job_applies_offset(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_get_multi_job_applies_limit(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_get_multi_job_default_limit_is_20(self, async_session: AsyncSession, test_user: User):
        pass

    async def test_get_multi_job_combined_filters(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_get_multi_job_returns_empty_list_when_no_matches(self, async_session: AsyncSession, test_user: User):
        pass

    async def test_get_multi_job_returns_job_read_models(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass

    async def test_get_multi_job_search_does_not_match_partial_word_in_middle_unexpectedly(self, async_session: AsyncSession, test_user: User, test_job: Job):
        pass
