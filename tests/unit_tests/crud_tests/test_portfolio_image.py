import pytest
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.crud.crud_portfolio_images import crud_portfolio_images
from src.app.models import WorkerProfile, PortfolioImage
from src.app.schemas.portfolio_image import PortfolioImageCreate, PortfolioImageRead
from tests.conftest import fake

# ———————————— Fixtures and Factories ———————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
IMAGE_URL = fake.image_url()


def create_schema(**overrides) -> PortfolioImageCreate:
    return PortfolioImageCreate(
        image_url=IMAGE_URL,
        **overrides
    )


class TestPortfolioImage:

    # —————— Test Create —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
    @pytest.mark.unit
    async def test_create_returns_portfolio_image(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
        portfolio_image = await crud_portfolio_images.create(
            db=async_session,
            object=create_schema(worker_profile_id=test_worker_profile.id),
            schema_to_select=PortfolioImageRead,
            return_as_model=True
        )
        assert portfolio_image is not None
        assert portfolio_image.image_url == IMAGE_URL
        assert portfolio_image.worker_profile_id == test_worker_profile.id
        assert portfolio_image.created_at is not None

    # —————— Test Get Multi —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

    @pytest.mark.unit
    async def test_get_multi_returns_all_portfolio_images(
            self,
            async_session: AsyncSession,
            test_worker_profile: WorkerProfile,
            test_other_worker_profile: WorkerProfile,
    ):
        # Create portfolio images
        target_count, other_count = 7, 3
        portfolio_image_rows = [
                                   {"worker_profile_id": test_worker_profile.id, "image_url": fake.image_url()} for _ in range(target_count)
                               ] + [
                                   {"worker_profile_id": test_other_worker_profile.id, "image_url": fake.image_url()} for _ in range(other_count)
                               ]
        await async_session.execute(insert(PortfolioImage), portfolio_image_rows)
        await async_session.commit()

        result = await crud_portfolio_images.get_multi(
            db=async_session,
            worker_profile_id=test_worker_profile.id,
            schema_to_select=PortfolioImageRead,
            return_as_model=True
        )
        assert len(result['data']) == target_count
        assert all(item.worker_profile_id == test_worker_profile.id for item in result['data'])
