# tests/unit_tests/crud_tests/test_worker_trade.py
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.exceptions.http_exceptions import DuplicateValueException, NotFoundException
from src.app.crud.crud_trade_categories import crud_trade_category
from src.app.crud.crud_worker_profiles import crud_worker_profiles
from src.app.crud.crud_workers_trades import crud_worker_trades
from src.app.models import User, TradeCategory, WorkerProfile, WorkerTrade, SkillLevel
from src.app.schemas.trade_category import TradeCategoryCreate
from src.app.schemas.worker_profile import WorkerProfileCreate
from src.app.schemas.worker_trade import WorkerTradeCreate, WorkerTradeUpdate, WorkerTradeRead


# ─── Factories ────────────────────────────────────────────────────────────────
def create_schema(**overrides) -> WorkerTradeCreate:
    defaults = {
        "worker_profile_id": 1,  # overridden in tests with real ids
        "trade_category_id": 1,
        "skill_level": SkillLevel.junior,
    }
    return WorkerTradeCreate.model_validate({**defaults, **overrides})


async def create_test_worker_trade(db: AsyncSession, worker_profile_id: int, trade_category_id: int, skill_level: SkillLevel = SkillLevel.junior) -> WorkerTrade:
    return await crud_worker_trades.create(
        db=db,
        object=create_schema(
            worker_profile_id=worker_profile_id,
            trade_category_id=trade_category_id,
            skill_level=skill_level,
        ),
        schema_to_select=WorkerTradeRead,
        return_as_model=True,
    )


def worker_create_schema(**overrides) -> WorkerProfileCreate:
    defaults = {
        "bio": "Experienced plumber with 10 years of experience.",
        "years_of_experience": 10,
        "hourly_rate": Decimal("75.00"),
        "service_radius_km": 20,
        "avatar_url": "https://example.com/avatar.jpg",
        "is_available": True,
        **overrides,
    }
    return WorkerProfileCreate.model_validate({**defaults, **overrides})


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def test_worker_trade(async_session: AsyncSession, test_worker_profile: WorkerProfile, test_trade_category: TradeCategory) -> WorkerTrade:
    return await create_test_worker_trade(
        async_session,
        worker_profile_id=test_worker_profile.id,
        trade_category_id=test_trade_category.id,
    )


# ─── CRUD Tests ───────────────────────────────────────────────────────────────

class TestCreate:
    async def test_create_returns_worker_trade(
            self,
            async_session: AsyncSession,
            test_worker_profile: WorkerProfile,
            test_trade_category: TradeCategory,
    ):
        worker_trade = await create_test_worker_trade(
            async_session,
            worker_profile_id=test_worker_profile.id,
            trade_category_id=test_trade_category.id,
        )
        assert isinstance(worker_trade, WorkerTrade)

    async def test_create_persists_fields(
            self,
            async_session: AsyncSession,
            test_worker_profile: WorkerProfile,
            test_trade_category: TradeCategory,
    ):
        worker_trade = await create_test_worker_trade(
            async_session,
            worker_profile_id=test_worker_profile.id,
            trade_category_id=test_trade_category.id,
            skill_level=SkillLevel.senior,
        )
        assert worker_trade.worker_profile_id == test_worker_profile.id
        assert worker_trade.trade_category_id == test_trade_category.id
        assert worker_trade.skill_level == SkillLevel.senior

    async def test_create_default_skill_level_is_junior(
            self,
            async_session: AsyncSession,
            test_worker_profile: WorkerProfile,
            test_trade_category: TradeCategory,
    ):
        worker_trade = await create_test_worker_trade(
            async_session,
            worker_profile_id=test_worker_profile.id,
            trade_category_id=test_trade_category.id,
        )
        assert worker_trade.skill_level == SkillLevel.junior

    async def test_create_assigns_id(
            self,
            async_session: AsyncSession,
            test_worker_profile: WorkerProfile,
            test_trade_category: TradeCategory,
    ):
        worker_trade = await create_test_worker_trade(
            async_session,
            worker_profile_id=test_worker_profile.id,
            trade_category_id=test_trade_category.id,
        )
        assert worker_trade.id is not None
        assert isinstance(worker_trade.id, int)

    async def test_create_fails_nonexistent_worker(
            self,
            async_session: AsyncSession,
            test_trade_category: TradeCategory,
    ):
        with pytest.raises(NotFoundException):
            await create_test_worker_trade(
                async_session,
                worker_profile_id=99999,
                trade_category_id=test_trade_category.id,
            )

    async def test_create_fails_nonexistent_trade(
            self,
            async_session: AsyncSession,
            test_worker_profile: WorkerProfile,
    ):
        with pytest.raises(NotFoundException):
            await create_test_worker_trade(
                async_session,
                worker_profile_id=test_worker_profile.id,
                trade_category_id=99999,
            )

    async def test_create_fails_duplicate_worker_trade(self, async_session: AsyncSession, test_worker_profile: WorkerProfile, test_trade_category: TradeCategory):
        await create_test_worker_trade(async_session, worker_profile_id=test_worker_profile.id, trade_category_id=test_trade_category.id)
        with pytest.raises(DuplicateValueException, match="already assigned"):
            await create_test_worker_trade(async_session, worker_profile_id=test_worker_profile.id, trade_category_id=test_trade_category.id)

    async def test_same_worker_can_have_multiple_trades(self, async_session: AsyncSession, test_worker_profile: WorkerProfile):
        trade1 = await crud_trade_category.create(db=async_session, object=TradeCategoryCreate(name="plumbing", display_name="Plumbing"))
        trade2 = await crud_trade_category.create(db=async_session, object=TradeCategoryCreate(name="electrical", display_name="Electrical"))
        wt1 = await create_test_worker_trade(async_session, test_worker_profile.id, trade1.id)
        wt2 = await create_test_worker_trade(async_session, test_worker_profile.id, trade2.id)
        assert wt1.trade_category_id != wt2.trade_category_id

    async def test_same_trade_can_have_multiple_workers(self, async_session: AsyncSession, test_trade_category: TradeCategory, test_user: User, other_user: User):
        worker1 = await crud_worker_profiles.create(db=async_session, object=worker_create_schema(user_id=test_user.id))
        worker2 = await crud_worker_profiles.create(db=async_session, object=worker_create_schema(user_id=other_user.id))
        wt1 = await create_test_worker_trade(async_session, worker1.id, test_trade_category.id)
        wt2 = await create_test_worker_trade(async_session, worker2.id, test_trade_category.id)
        assert wt1.worker_profile_id != wt2.worker_profile_id


class TestRead:
    async def test_get_trades_for_worker(
            self,
            async_session: AsyncSession,
            test_worker_profile: WorkerProfile,
            test_trade_category: TradeCategory,
    ):
        await create_test_worker_trade(
            async_session,
            worker_profile_id=test_worker_profile.id,
            trade_category_id=test_trade_category.id,
        )
        result = await crud_worker_trades.get_trades_for_worker_profile(
            db=async_session,
            worker_profile_id=test_worker_profile.id,
        )
        assert len(result) == 1
        assert result[0].trade_category_id == test_trade_category.id

    async def test_get_trades_for_worker_returns_empty_when_none(
            self,
            async_session: AsyncSession,
            test_worker_profile: WorkerProfile,
    ):
        result = await crud_worker_trades.get_trades_for_worker_profile(
            db=async_session,
            worker_profile_id=test_worker_profile.id,
        )
        assert result == []

    async def test_get_trades_for_worker_fails_nonexistent_worker(
            self,
            async_session: AsyncSession,
    ):
        with pytest.raises(NotFoundException):
            await crud_worker_trades.get_trades_for_worker_profile(
                db=async_session,
                worker_profile_id=99999,
            )

    async def test_get_workers_for_trade(
            self,
            async_session: AsyncSession,
            test_worker_profile: WorkerProfile,
            test_trade_category: TradeCategory,
    ):
        await create_test_worker_trade(
            async_session,
            worker_profile_id=test_worker_profile.id,
            trade_category_id=test_trade_category.id,
        )
        result = await crud_worker_trades.get_worker_profiles_for_trade(
            db=async_session,
            trade_category_id=test_trade_category.id,
        )
        assert len(result) == 1
        assert result[0].worker_profile_id == test_worker_profile.id

    async def test_get_workers_for_trade_returns_empty_when_none(
            self,
            async_session: AsyncSession,
            test_trade_category: TradeCategory,
    ):
        result = await crud_worker_trades.get_worker_profiles_for_trade(
            db=async_session,
            trade_category_id=test_trade_category.id,
        )
        assert result == []

    async def test_get_workers_for_trade_fails_nonexistent_trade(
            self,
            async_session: AsyncSession,
    ):
        with pytest.raises(NotFoundException):
            await crud_worker_trades.get_worker_profiles_for_trade(
                db=async_session,
                trade_category_id=99999,
            )

    async def test_get_trades_for_worker_loads_nested_trade(
            self,
            async_session: AsyncSession,
            test_worker_profile: WorkerProfile,
            test_trade_category: TradeCategory,
    ):
        await create_test_worker_trade(
            async_session,
            worker_profile_id=test_worker_profile.id,
            trade_category_id=test_trade_category.id,
        )
        result = await crud_worker_trades.get_trades_for_worker_profile(
            db=async_session,
            worker_profile_id=test_worker_profile.id,
        )
        assert result[0].trade_category is not None
        assert result[0].trade_category.id == test_trade_category.id

    async def test_get_workers_for_trade_loads_nested_worker(
            self,
            async_session: AsyncSession,
            test_worker_profile: WorkerProfile,
            test_trade_category: TradeCategory,
    ):
        await create_test_worker_trade(
            async_session,
            worker_profile_id=test_worker_profile.id,
            trade_category_id=test_trade_category.id,
        )
        result = await crud_worker_trades.get_worker_profiles_for_trade(
            db=async_session,
            trade_category_id=test_trade_category.id,
        )
        assert result[0].worker_profile is not None
        assert result[0].worker_profile.id == test_worker_profile.id


class TestUpdate:
    async def test_update_skill_level(
            self,
            async_session: AsyncSession,
            test_worker_trade: WorkerTrade,
    ):
        await crud_worker_trades.update(
            db=async_session,
            object=WorkerTradeUpdate(skill_level=SkillLevel.senior),
            id=test_worker_trade.id,
        )
        updated = await async_session.get(WorkerTrade, test_worker_trade.id)
        assert updated.skill_level == SkillLevel.senior

    async def test_update_all_skill_levels(
            self,
            async_session: AsyncSession,
            test_worker_trade: WorkerTrade,
    ):
        for level in SkillLevel:
            await crud_worker_trades.update(
                db=async_session,
                object=WorkerTradeUpdate(skill_level=level),
                id=test_worker_trade.id,
            )
            await async_session.refresh(test_worker_trade)
            assert test_worker_trade.skill_level == level

    async def test_update_fails_nonexistent_worker_trade(
            self,
            async_session: AsyncSession,
    ):
        with pytest.raises(NotFoundException):
            await crud_worker_trades.update(
                db=async_session,
                object=WorkerTradeUpdate(skill_level=SkillLevel.senior),
                id=99999,
            )


class TestDelete:
    async def test_delete_removes_worker_trade(
            self,
            async_session: AsyncSession,
            test_worker_trade: WorkerTrade,
    ):
        await crud_worker_trades.delete(db=async_session, id=test_worker_trade.id)
        result = await async_session.get(WorkerTrade, test_worker_trade.id)
        assert result is None

    async def test_delete_fails_nonexistent_worker_trade(
            self,
            async_session: AsyncSession,
    ):
        with pytest.raises(NotFoundException):
            await crud_worker_trades.delete(db=async_session, id=99999)

    async def test_delete_does_not_cascade_to_worker(
            self,
            async_session: AsyncSession,
            test_worker_profile: WorkerProfile,
            test_worker_trade: WorkerTrade,
    ):
        await crud_worker_trades.delete(db=async_session, id=test_worker_trade.id)
        worker = await async_session.get(WorkerProfile, test_worker_profile.id)
        assert worker is not None

    async def test_delete_does_not_cascade_to_trade(
            self,
            async_session: AsyncSession,
            test_trade_category: TradeCategory,
            test_worker_trade: WorkerTrade,
    ):
        await crud_worker_trades.delete(db=async_session, id=test_worker_trade.id)
        trade = await async_session.get(TradeCategory, test_trade_category.id)
        assert trade is not None


class TestEdgeCases:
    @pytest.mark.parametrize("parent_model, parent_attr", [(WorkerProfile, "worker_profile_id"), (TradeCategory, "trade_category_id"), ])
    async def test_worker_trade_cascade_delete(self, async_session: AsyncSession, test_worker_trade: WorkerTrade, parent_model, parent_attr):
        parent = await async_session.get(parent_model, getattr(test_worker_trade, parent_attr))
        await async_session.delete(parent)
        await async_session.commit()
        result = await async_session.execute(select(WorkerTrade).where(WorkerTrade.id == test_worker_trade.id))
        assert result.scalar_one_or_none() is None

    async def test_reassign_trade_after_deletion(
            self,
            async_session: AsyncSession,
            test_worker_profile: WorkerProfile,
            test_trade_category: TradeCategory,
            test_worker_trade: WorkerTrade,
    ):
        """After deleting a worker trade, the same pair can be reassigned."""
        await crud_worker_trades.delete(db=async_session, id=test_worker_trade.id)
        new_trade = await create_test_worker_trade(
            async_session,
            worker_profile_id=test_worker_profile.id,
            trade_category_id=test_trade_category.id,
        )
        assert new_trade.id is not None
        assert new_trade.worker_profile_id == test_worker_profile.id
        assert new_trade.trade_category_id == test_trade_category.id
