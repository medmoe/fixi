import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.crud.crud_service_category import crud_service_category
from src.app.schemas.service_category import ServiceCategoryCreate, ServiceCategoryUpdate


class TestServiceCategoryCRUD:
    @pytest.mark.asyncio
    async def test_create_service_category(self, session: AsyncSession):
        service_category_create = ServiceCategoryCreate(name="Test Service Category")
        service_category = await crud_service_category.create(session, obj_in=service_category_create)
        assert service_category.name == "Test Service Category"

    @pytest.mark.asyncio
    async def test_get_service_category_by_id(self, session: AsyncSession):
        service_category_create = ServiceCategoryCreate(name="Test Service Category")
        service_category = await crud_service_category.create(session, obj_in=service_category_create)
        retrieved_service_category = await crud_service_category.get(session, id=service_category.id)
        assert retrieved_service_category.name == "Test Service Category"

    @pytest.mark.asyncio
    async def test_get_service_category_by_name(self, session: AsyncSession):
        service_category_create = ServiceCategoryCreate(name="Test Service Category")
        service_category = await crud_service_category.create(session, obj_in=service_category_create)
        retrieved_service_category = await crud_service_category.get(session, name=service_category.name)
        assert retrieved_service_category.name == "Test Service Category"

    @pytest.mark.asyncio
    async def test_update_service_category_description(self, session: AsyncSession):
        service_category_create = ServiceCategoryCreate(name="Test Service Category")
        service_category = await crud_service_category.create(session, obj_in=service_category_create)
        service_category_update = ServiceCategoryUpdate(description="Test Description")
        updated_service_category = await crud_service_category.update(session, db_obj=service_category,
                                                                      obj_in=service_category_update)
        assert updated_service_category.description == "Test Description"

    @pytest.mark.asyncio
    async def test_update_service_category_name_only(self, session: AsyncSession):
        service_category_create = ServiceCategoryCreate(name="Test Service Category")
        service_category = await crud_service_category.create(session, obj_in=service_category_create)
        service_category_update = ServiceCategoryUpdate(name="Updated Test Service Category")
        updated_service_category = await crud_service_category.update(session, db_obj=service_category,
                                                                      obj_in=service_category_update)
        assert updated_service_category.name == "Updated Test Service Category"

    @pytest.mark.asyncio
    async def test_delete_service_category(self, session: AsyncSession):
        service_category_create = ServiceCategoryCreate(name="Test Service Category")
        service_category = await crud_service_category.create(session, obj_in=service_category_create)
        await crud_service_category.delete(session, id=service_category.id)
        deleted_service_category = await crud_service_category.get(session, id=service_category.id)
        assert deleted_service_category is None

    @pytest.mark.asyncio
    async def test_get_multiple_service_categories(self, session: AsyncSession):
        service_categories = [
            ServiceCategoryCreate(name=f"Test Service Category {i}", description="Test Service Category Description")
            for i in range(5)]

        service_category = await crud_service_category.create_many(session, objects=service_categories)
        retrieved_service_categories = await crud_service_category.get_multi(session)
        assert len(retrieved_service_categories) == len(service_categories)

    @pytest.mark.asyncio
    async def test_service_category_exists(self, session: AsyncSession):
        service_category_create = ServiceCategoryCreate(name="Test Service Category")
        service_category = await crud_service_category.create(session, obj_in=service_category_create)
        exists = await crud_service_category.exists(session, id=service_category.id)
        assert exists is True

    @pytest.mark.asyncio
    async def test_create_duplicate_service_category_name_fails(self, session: AsyncSession):
        service_categories = [ServiceCategoryCreate(name="duplicate", description="test") for _ in range(5)]
        with pytest.raises(IntegrityError):
            await crud_service_category.create_many(session, objects=service_categories)
