import pytest
from sqlalchemy.exc import IntegrityError, DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import PortfolioImage, WorkerProfile
from tests.conftest import fake


class TestPortfolioImage:
    @pytest.mark.unit
    async def test_successful_creation_with_all_fields(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
        portfolio_img = PortfolioImage(
            worker_profile_id=test_worker_profile.id,
            image_url=fake.image_url()
        )
        async_session.add(portfolio_img)
        await async_session.commit()

        assert portfolio_img.id is not None
        assert portfolio_img.worker_profile_id == test_worker_profile.id
        assert portfolio_img.image_url is not None
        assert portfolio_img.created_at is not None

    @pytest.mark.unit
    async def test_failed_creation_with_no_worker_profile_id(self, async_session: AsyncSession):
        portfolio_img = PortfolioImage(image_url=fake.image_url(), worker_profile_id=9999)
        async_session.add(portfolio_img)
        with pytest.raises(IntegrityError):
            await async_session.commit()

    @pytest.mark.unit
    async def test_failed_creation_with_no_image_url(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
        portfolio_img = PortfolioImage(worker_profile_id=test_worker_profile.id, image_url=None)
        async_session.add(portfolio_img)
        with pytest.raises(IntegrityError):
            await async_session.commit()

    @pytest.mark.unit
    async def test_failed_creation_with_image_url_over_max_characters(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
        portfolio_img = PortfolioImage(
            worker_profile_id=test_worker_profile.id,
            image_url=fake.image_url() * 1000
        )
        async_session.add(portfolio_img)
        with pytest.raises(DBAPIError):
            await async_session.commit()

    @pytest.mark.unit
    async def test_successful_delete_on_cascade(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
        portfolio_img = PortfolioImage(worker_profile_id=test_worker_profile.id, image_url=fake.image_url())
        async_session.add(portfolio_img)
        await async_session.commit()
        portfolio_img_id = portfolio_img.id
        await async_session.delete(test_worker_profile)
        await async_session.commit()
        async_session.expire_all() # Alternative — user execute(select(...)) to always bypass cache
        deleted = await async_session.get(PortfolioImage, portfolio_img_id)
        assert deleted is None

    # class TestCreatePortfolioImage:
    #     @pytest.mark.unit
    #     async def test_success_with_all_fields(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
    #         pass
    #
    #     @pytest.mark.unit
    #     async def test_failure_with_missing_worker_profile_id(self, async_session: AsyncSession):
    #         pass
    #
    #     @pytest.mark.unit
    #     async def test_failure_with_missing_image_url(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
    #         pass
    #
    #     @pytest.mark.unit
    #     async def test_worker_profile_can_have_multiple_portfolio_images(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
    #         pass
    #
    #     @pytest.mark.skip(reason="not implemented yet")
    #     @pytest.mark.unit
    #     async def test_failure_when_max_portfolio_images_reached(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
    #         pass
