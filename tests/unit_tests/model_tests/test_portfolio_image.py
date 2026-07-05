import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import PortfolioImage, WorkerProfile

class TestPortfolioImage:
    class TestCreatePortfolioImage:
        @pytest.mark.unit
        async def test_success_with_all_fields(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
            pass

        @pytest.mark.unit
        async def test_failure_with_missing_worker_profile_id(self, async_session: AsyncSession):
            pass

        @pytest.mark.unit
        async def test_failure_with_missing_image_url(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
            pass

        @pytest.mark.unit
        async def test_worker_profile_can_have_multiple_portfolio_images(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
            pass

        @pytest.mark.skip(reason="not implemented yet")
        @pytest.mark.unit
        async def test_failure_when_max_portfolio_images_reached(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
            pass




