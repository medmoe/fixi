# ———————— Fixtures and Factories ————————————————————————————————————————————————————————————————————————————————————————————————————————

import pytest
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import Job, User


async def bulk_job_create(db: AsyncSession, parameters: list[dict]) -> None:
    await db.execute(insert(Job), parameters)
    await db.commit()


# ———————— Create ————————————————————————————————————————————————————————————————————————————————————————————————————————


# ———————— Update ————————————————————————————————————————————————————————————————————————————————————————————————————————

# ———————— Delete ————————————————————————————————————————————————————————————————————————————————————————————————————————


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
