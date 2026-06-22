import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import WorkerTrade, WorkerProfile, User, TradeCategory, UserRole, SkillLevel


class TestWorkerTrade:
    @pytest.mark.asyncio
    async def test_create_worker_trade(self, async_session: AsyncSession):
        user = User(name="John Doe", username="johndoe", email="johndoe@example.com", hashed_password="hashed_password", role_type=UserRole.worker)
        async_session.add(user)
        await async_session.commit()
        await async_session.refresh(user)

        worker = WorkerProfile(user_id=user.id)
        async_session.add(worker)
        await async_session.commit()
        await async_session.refresh(worker)

        trade_category = TradeCategory(name="plumber", display_name="Plumber", icon_name="wrench")
        async_session.add(trade_category)
        await async_session.commit()
        await async_session.refresh(trade_category)

        worker_trade = WorkerTrade(worker_id=worker.id, trade_id=trade_category.id)
        async_session.add(worker_trade)
        await async_session.commit()
        await async_session.refresh(worker_trade)

        assert worker_trade.id is not None
        assert worker_trade.worker_id == worker.id
        assert worker_trade.trade_id == trade_category.id
        assert worker_trade.skill_level == SkillLevel.junior
