import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import User, Job


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
