import pytest
from sqlalchemy.exc import IntegrityError, DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models.trade_category import TradeCategory

class TestTradeCategory:

    @pytest.mark.asyncio
    async def test_create_trade_category(self, async_session: AsyncSession):
        """ Test creating a trade category with all fields"""
        trade_category = TradeCategory(name="plumber", display_name="Plumber", icon_name="wrench")
        async_session.add(trade_category)
        await async_session.commit()
        await async_session.refresh(trade_category)

        assert trade_category.id is not None
        assert trade_category.name == "plumber"
        assert trade_category.display_name == "Plumber"
        assert trade_category.icon_name == "wrench"
        assert trade_category.created_at is not None
        assert trade_category.updated_at is not None

    @pytest.mark.asyncio
    async def test_failed_create_trade_category_with_existing_name(self, async_session: AsyncSession):
        """ Test creating a trade category with an existing name"""
        trade_category = TradeCategory(name="plumber", display_name="Plumber", icon_name="wrench")
        async_session.add(trade_category)
        await async_session.commit()
        await async_session.refresh(trade_category)

        with pytest.raises(IntegrityError):
            trade_category = TradeCategory(name="plumber", display_name="Plumber", icon_name="wrench")
            async_session.add(trade_category)
            await async_session.commit()


    @pytest.mark.asyncio
    async def test_failed_create_trade_category_with_missing_fields(self, async_session: AsyncSession):
        """ Test creating a trade category with missing fields"""
        with pytest.raises(TypeError):
            trade_category = TradeCategory()
            async_session.add(trade_category)
            await async_session.commit()

    @pytest.mark.asyncio
    async def test_failed_create_trade_category_with_long_name(self, async_session: AsyncSession):
        """ Test creating a trade category with a long name"""
        with pytest.raises(DBAPIError):
            trade_category = TradeCategory(name="a" * 256, display_name="Plumber", icon_name="wrench")
            async_session.add(trade_category)
            await async_session.commit()


    @pytest.mark.asyncio
    async def test_create_sub_trade_category(self, async_session: AsyncSession):
        trade_category_parent = TradeCategory(name="plumber", display_name="Plumber", icon_name="wrench")
        async_session.add(trade_category_parent)
        await async_session.commit()
        await async_session.refresh(trade_category_parent)

        trade_category_child = TradeCategory(name="residential-plumbing", display_name="Residential Plumbing", icon_name="wrench", parent_id=trade_category_parent.id)
        async_session.add(trade_category_child)
        await async_session.commit()
        await async_session.refresh(trade_category_child)

        assert trade_category_child.parent_id == trade_category_parent.id
