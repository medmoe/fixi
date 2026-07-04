import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.exceptions.http_exceptions import (
    BadRequestException,
    DuplicateValueException,
    NotFoundException,
)
from src.app.crud.crud_worker_trade import crud_worker_trades, MAX_TRADES_PER_WORKER
from src.app.models import TradeCategory, WorkerProfile, WorkerTrade, SkillLevel
from tests.conftest import create_test_worker_profile, create_test_trade_category


# ─── Factories ────────────────────────────────────────────────────────────────

async def create_trade(
        async_session: AsyncSession,
        name: str,
        display_name: str,
) -> TradeCategory:
    return await create_test_trade_category(
        async_session,
        name=name,
        display_name=display_name,
    )


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def worker_profile(async_session: AsyncSession) -> WorkerProfile:
    return await create_test_worker_profile(async_session)


@pytest_asyncio.fixture
async def trade(async_session: AsyncSession) -> TradeCategory:
    return await create_trade(async_session, name="plumbing", display_name="Plumbing")


@pytest_asyncio.fixture
async def assigned_trade(
        async_session: AsyncSession,
        worker_profile: WorkerProfile,
        trade: TradeCategory,
) -> WorkerTrade:
    """Worker already has one trade assigned."""
    trades = await crud_worker_trades.assign_trade(
        db=async_session,
        worker_profile_id=worker_profile.id,
        trade_category_id=trade.id,
    )
    return trades[0]


# ─── TestAssignTrade ──────────────────────────────────────────────────────────

class TestAssignTrade:
    async def test_assign_trade_returns_updated_list(
            self,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
            trade: TradeCategory,
    ):
        result = await crud_worker_trades.assign_trade(
            db=async_session,
            worker_profile_id=worker_profile.id,
            trade_category_id=trade.id,
        )
        assert isinstance(result, list)
        assert len(result) == 1
        assert result[0].trade_category_id == trade.id

    async def test_assign_trade_default_skill_level_is_junior(
            self,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
            trade: TradeCategory,
    ):
        result = await crud_worker_trades.assign_trade(
            db=async_session,
            worker_profile_id=worker_profile.id,
            trade_category_id=trade.id,
        )
        assert result[0].skill_level == SkillLevel.junior

    async def test_assign_trade_with_skill_level(
            self,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
            trade: TradeCategory,
    ):
        result = await crud_worker_trades.assign_trade(
            db=async_session,
            worker_profile_id=worker_profile.id,
            trade_category_id=trade.id,
            skill_level=SkillLevel.senior,
        )
        assert result[0].skill_level == SkillLevel.senior

    async def test_assign_trade_fails_duplicate(
            self,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
            trade: TradeCategory,
            assigned_trade: WorkerTrade,  # already assigned
    ):
        with pytest.raises(DuplicateValueException):
            await crud_worker_trades.assign_trade(
                db=async_session,
                worker_profile_id=worker_profile.id,
                trade_category_id=trade.id,
            )

    async def test_assign_trade_fails_nonexistent_worker(
            self,
            async_session: AsyncSession,
            trade: TradeCategory,
    ):
        with pytest.raises(NotFoundException):
            await crud_worker_trades.assign_trade(
                db=async_session,
                worker_profile_id=99999,
                trade_category_id=trade.id,
            )

    async def test_assign_trade_fails_nonexistent_trade(
            self,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
    ):
        with pytest.raises(NotFoundException):
            await crud_worker_trades.assign_trade(
                db=async_session,
                worker_profile_id=worker_profile.id,
                trade_category_id=99999,
            )

    async def test_assign_trade_enforces_max_limit(
            self,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
    ):
        """Worker cannot have more than MAX_TRADES_PER_WORKER trades."""
        # assign up to the limit
        for i in range(MAX_TRADES_PER_WORKER):
            trade = await create_trade(
                async_session,
                name=f"trade-{i}",
                display_name=f"Trade {i}",
            )
            await crud_worker_trades.assign_trade(
                db=async_session,
                worker_profile_id=worker_profile.id,
                trade_category_id=trade.id,
            )

        # one more should fail
        extra_trade = await create_trade(
            async_session,
            name="extra-trade",
            display_name="Extra Trade",
        )
        with pytest.raises(BadRequestException, match=str(MAX_TRADES_PER_WORKER)):
            await crud_worker_trades.assign_trade(
                db=async_session,
                worker_profile_id=worker_profile.id,
                trade_category_id=extra_trade.id,
            )

    async def test_assign_trade_at_limit_exactly_5(
            self,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
    ):
        """Exactly 5 trades should succeed."""
        for i in range(MAX_TRADES_PER_WORKER):
            trade = await create_trade(
                async_session,
                name=f"trade-{i}",
                display_name=f"Trade {i}",
            )
            result = await crud_worker_trades.assign_trade(
                db=async_session,
                worker_profile_id=worker_profile.id,
                trade_category_id=trade.id,
            )
        assert len(result) == MAX_TRADES_PER_WORKER  # ✅ exactly 5


# ─── TestRemoveTrade ──────────────────────────────────────────────────────────

class TestRemoveTrade:
    async def test_remove_trade_returns_updated_list(
            self,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
            trade: TradeCategory,
            assigned_trade: WorkerTrade,
    ):
        result = await crud_worker_trades.remove_trade(
            db=async_session,
            worker_profile_id=worker_profile.id,
            trade_category_id=trade.id,
        )
        assert isinstance(result, list)
        assert len(result) == 0  # trade was removed

    async def test_remove_trade_only_removes_specified_trade(
            self,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
            trade: TradeCategory,
            assigned_trade: WorkerTrade,
    ):
        # add a second trade
        second_trade = await create_trade(
            async_session,
            name="electrical",
            display_name="Electrical",
        )
        await crud_worker_trades.assign_trade(
            db=async_session,
            worker_profile_id=worker_profile.id,
            trade_category_id=second_trade.id,
        )

        # remove only the first trade
        result = await crud_worker_trades.remove_trade(
            db=async_session,
            worker_profile_id=worker_profile.id,
            trade_category_id=trade.id,
        )
        assert len(result) == 1  # second trade still there
        assert result[0].trade_category_id == second_trade.id  # correct trade remains

    async def test_remove_trade_fails_not_assigned(
            self,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
            trade: TradeCategory,
    ):
        """Removing a trade that was never assigned raises NotFoundException."""
        with pytest.raises(NotFoundException):
            await crud_worker_trades.remove_trade(
                db=async_session,
                worker_profile_id=worker_profile.id,
                trade_category_id=trade.id,  # never assigned
            )

    async def test_remove_trade_fails_nonexistent_worker(
            self,
            async_session: AsyncSession,
            trade: TradeCategory,
    ):
        with pytest.raises(NotFoundException):
            await crud_worker_trades.remove_trade(
                db=async_session,
                worker_profile_id=99999,
                trade_category_id=trade.id,
            )

    async def test_remove_trade_allows_reassignment(
            self,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
            trade: TradeCategory,
            assigned_trade: WorkerTrade,
    ):
        """After removing a trade, the same trade can be reassigned."""
        await crud_worker_trades.remove_trade(
            db=async_session,
            worker_profile_id=worker_profile.id,
            trade_category_id=trade.id,
        )
        result = await crud_worker_trades.assign_trade(
            db=async_session,
            worker_profile_id=worker_profile.id,
            trade_category_id=trade.id,
        )
        assert len(result) == 1
        assert result[0].trade_category_id == trade.id

    async def test_remove_trade_below_limit_allows_new_assignment(
            self,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
    ):
        """After removing one trade from a full worker, a new one can be added."""
        trades = []
        for i in range(MAX_TRADES_PER_WORKER):
            t = await create_trade(
                async_session,
                name=f"trade-{i}",
                display_name=f"Trade {i}",
            )
            trades.append(t)
            await crud_worker_trades.assign_trade(
                db=async_session,
                worker_profile_id=worker_profile.id,
                trade_category_id=t.id,
            )

        # remove one
        await crud_worker_trades.remove_trade(
            db=async_session,
            worker_profile_id=worker_profile.id,
            trade_category_id=trades[0].id,
        )

        # now can add a new one
        new_trade = await create_trade(
            async_session,
            name="new-trade",
            display_name="New Trade",
        )
        result = await crud_worker_trades.assign_trade(
            db=async_session,
            worker_profile_id=worker_profile.id,
            trade_category_id=new_trade.id,
        )
        assert len(result) == MAX_TRADES_PER_WORKER  # back to 5 ✅
