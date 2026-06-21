import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models.service_category import ServiceCategory


class TestServiceCategoryModel:
    """ Test ServiceCategory model """

    @pytest.mark.asyncio
    async def test_create_service_category(self, async_session: AsyncSession):
        service_category = ServiceCategory(name="Test Service Category", description="This is a test service category")
        async_session.add(service_category)
        await async_session.commit()
        await async_session.refresh(service_category)

        # Verify fields are created
        assert service_category.id is not None
        assert isinstance(service_category.id, int)
        assert service_category.name == "Test Service Category"
        assert service_category.description == "This is a test service category"

    @pytest.mark.asyncio
    async def test_create_service_category_without_description(self, async_session: AsyncSession):
        service_category = ServiceCategory(name="Test Service Category")

        async_session.add(service_category)
        await async_session.commit()
        await async_session.refresh(service_category)

        assert service_category.id is not None
        assert isinstance(service_category.id, int)
        assert service_category.name == "Test Service Category"
        assert service_category.description is None

    @pytest.mark.asyncio
    async def test_service_category_name_is_required(self, async_session: AsyncSession):
        service_category = ServiceCategory(name=None)

        async_session.add(service_category)
        with pytest.raises(IntegrityError):
            await async_session.commit()

        await async_session.rollback()
