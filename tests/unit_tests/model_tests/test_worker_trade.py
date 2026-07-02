import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.models import WorkerTrade, WorkerProfile, TradeCategory, SkillLevel


class TestWorkerTrade:
    @pytest.mark.asyncio
    async def test_create_worker_trade(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
        trade_category = TradeCategory(name="plumber", display_name="Plumber", icon_name="wrench")
        async_session.add(trade_category)
        await async_session.commit()
        await async_session.refresh(trade_category)

        worker_trade = WorkerTrade(worker_profile_id=test_worker_profile.id, trade_id=trade_category.id, worker=test_worker_profile, trade=trade_category)
        async_session.add(worker_trade)
        await async_session.commit()
        await async_session.refresh(worker_trade)

        assert worker_trade.id is not None
        assert worker_trade.worker_profile_id == test_worker_profile.id
        assert worker_trade.trade_id == trade_category.id
        assert worker_trade.skill_level == SkillLevel.junior
