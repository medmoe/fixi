# src/app/crud/crud_workers_trades.py
from typing import Any, cast

from fastcrud import FastCRUD
from sqlalchemy import select
from sqlalchemy.engine import Row
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..core.exceptions.http_exceptions import BadRequestException, DuplicateValueException, NotFoundException
from ..models import SkillLevel, TradeCategory, WorkerProfile
from ..models.worker_trade import WorkerTrade
from ..schemas.worker_trade import (
    WorkerTradeCreate,
    WorkerTradeDelete,
    WorkerTradeRead,
    WorkerTradeUpdate,
    WorkerTradeUpdateInternal,
)

MAX_TRADES_PER_WORKER = 5


class CRUDWorkerTrade(FastCRUD[WorkerTrade, WorkerTradeCreate, WorkerTradeUpdate, WorkerTradeUpdateInternal, WorkerTradeDelete, WorkerTradeRead]):
    async def create(
            self,
            db: AsyncSession,
            object: WorkerTradeCreate,
            *,
            commit: bool = True,
            schema_to_select: type[Any] | None = None,
            return_as_model: bool = False,
            **kwargs: Any,
    ) -> Any:
        worker = await db.get(WorkerProfile, object.worker_profile_id)
        if worker is None:
            raise NotFoundException(f"Worker profile with id {object.worker_profile_id} does not exist.")

        trade = await db.get(TradeCategory, object.trade_category_id)
        if trade is None:
            raise NotFoundException(f"Trade category with id {object.trade_category_id} does not exist.")

        existing = await self.exists(db=db, worker_profile_id=object.worker_profile_id, trade_category_id=object.trade_category_id)
        if existing:
            raise DuplicateValueException(f"Worker {object.worker_profile_id} is already assigned to trade {object.trade_category_id}.")

        db_obj = WorkerTrade(worker_profile_id=object.worker_profile_id, trade_category_id=object.trade_category_id, skill_level=object.skill_level, worker_profile=worker, trade_category=trade)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
            self,
            db: AsyncSession,
            object: WorkerTradeUpdate | dict[str, Any],
            *,
            allow_multiple: bool = False,
            commit: bool = True,
            return_columns: list[str] | None = None,
            schema_to_select: type[Any] | None = None,
            return_as_model: bool = False,
            one_or_none: bool = False,
            **kwargs: Any,
    ) -> Any:
        worker_trade_id = kwargs.get("id")
        if not isinstance(worker_trade_id, int):
            raise ValueError("id must be a valid integer.")

        worker_trade = await db.get(WorkerTrade, worker_trade_id)
        if worker_trade is None:
            raise NotFoundException(f"WorkerTrade with id {worker_trade_id} does not exist.")

        return await super().update(db=db, object=object, id=worker_trade_id)

    async def delete(
            self,
            db: AsyncSession,
            db_row: Row[Any] | None = None,
            allow_multiple: bool = False,
            commit: bool = True,
            filters: WorkerTradeDelete | None = None,
            **kwargs: Any,
    ) -> None:
        id = kwargs.get("id")
        if not isinstance(id, int):
            raise ValueError("id must be provided as a keyword argument.")
        worker_trade = await db.get(WorkerTrade, id)
        if worker_trade is None:
            raise NotFoundException(f"WorkerTrade with id {id} does not exist.")
        await db.delete(worker_trade)
        await db.commit()

    async def _get_worker_trades(self, db: AsyncSession, *, filter_column: Any, filter_value: int, load_relationship: Any, entity_class: Any, entity_name: str) -> list[WorkerTrade]:
        """Private helper — validates entity exists then fetches related worker trades."""
        entity = await db.get(entity_class, filter_value)
        if entity is None:
            raise NotFoundException(f"{entity_name} with id {filter_value} does not exist.")

        result = await db.execute(
            select(WorkerTrade)
            .where(filter_column == filter_value)
            .options(selectinload(load_relationship))
        )
        return list(result.scalars().all())

    async def get_trades_for_worker_profile(self, db: AsyncSession, worker_profile_id: int) -> list[WorkerTrade]:
        """Get all trades assigned to a worker, with nested trade details."""
        return await self._get_worker_trades(
            db=db,
            filter_column=WorkerTrade.worker_profile_id,
            filter_value=worker_profile_id,
            load_relationship=WorkerTrade.trade_category,
            entity_class=WorkerProfile,
            entity_name="Worker profile",
        )

    async def get_worker_profiles_for_trade(self, db: AsyncSession, trade_category_id: int) -> list[WorkerTrade]:
        """Get all workers assigned to a trade, with nested worker details."""
        return await self._get_worker_trades(
            db=db,
            filter_column=WorkerTrade.trade_category_id,
            filter_value=trade_category_id,
            load_relationship=WorkerTrade.worker_profile,
            entity_class=TradeCategory,
            entity_name="Trade category",
        )

    async def assign_trade(self, db: AsyncSession, worker_profile_id: int, trade_category_id: int, skill_level: SkillLevel = SkillLevel.junior) -> list[WorkerTrade]:
        """ Assign a trade to a worker — enforces max 5 trades and no duplicates. """
        # verify worker profile exists
        worker_profile = cast(WorkerProfile | None, await db.get(WorkerProfile, worker_profile_id))
        if worker_profile is None:
            raise NotFoundException(f"Worker profile with ID {worker_profile_id} not found.")

        # verify trade exists
        trade = cast(TradeCategory | None, await db.get(TradeCategory, trade_category_id))
        if trade is None:
            raise NotFoundException(f"Trade category with ID {trade_category_id} not found.")

        # check duplicates
        already_assigned = await self.exists(db=db, worker_profile_id=worker_profile_id, trade_category_id=trade_category_id)
        if already_assigned:
            raise DuplicateValueException(f"Trade {trade_category_id} is already assigned to worker {worker_profile_id}.")

        # enforce max 5 trades
        current_trades = await self.get_trades_for_worker_profile(db=db, worker_profile_id=worker_profile_id)
        if len(current_trades) >= MAX_TRADES_PER_WORKER:
            raise BadRequestException(f"Worker {worker_profile_id} already has {MAX_TRADES_PER_WORKER} trades assigned.")

        # create the assignment
        db_obj = WorkerTrade(
            worker_profile_id=worker_profile_id,
            trade_category_id=trade_category_id,
            worker_profile=worker_profile,
            trade_category=trade,
            skill_level=skill_level
        )
        db.add(db_obj)
        await db.commit()

        # return full updated trades list
        return await self.get_trades_for_worker_profile(db=db, worker_profile_id=worker_profile_id)

    async def remove_trade(self, db: AsyncSession, worker_profile_id: int, trade_category_id: int) -> list[WorkerTrade]:
        """ Remove a trade assignment from a worker """
        # verify worker exists
        worker_profile = await db.get(WorkerProfile, worker_profile_id)
        if worker_profile is None:
            raise NotFoundException(f"Worker profile with ID {worker_profile_id} not found.")

        # find the assignment
        result = await db.execute(select(WorkerTrade).where(WorkerTrade.worker_profile_id == worker_profile_id, WorkerTrade.trade_category_id == trade_category_id))
        worker_trade = result.scalar_one_or_none()
        if worker_trade is None:
            raise NotFoundException(f"Trade {trade_category_id} is not assigned to worker {worker_profile_id}.")

        await db.delete(worker_trade)
        await db.commit()

        # return full updated trades list
        return await self.get_trades_for_worker_profile(db=db, worker_profile_id=worker_profile_id)


crud_worker_trades = CRUDWorkerTrade(WorkerTrade)
