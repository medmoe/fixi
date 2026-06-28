# src/app/crud/crud_worker_trade.py
from fastcrud import FastCRUD
from fastcrud.exceptions.http_exceptions import DuplicateValueException
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.trade_category import TradeCategory
from ..models.worker_profile import WorkerProfile
from ..models.worker_trade import WorkerTrade
from ..schemas.worker_trade import (
    WorkerTradeCreate,
    WorkerTradeDelete,
    WorkerTradeRead,
    WorkerTradeUpdate,
    WorkerTradeUpdateInternal,
)


class CRUDWorkerTrade(FastCRUD[WorkerTrade, WorkerTradeCreate, WorkerTradeUpdate, WorkerTradeUpdateInternal, WorkerTradeDelete, WorkerTradeRead]):
    async def create(self, db: AsyncSession, object: WorkerTradeCreate, **kwargs) -> WorkerTrade:
        # verify worker exists
        worker = await db.get(WorkerProfile, object.worker_id)
        if worker is None:
            raise NoResultFound(f"Worker profile with id {object.worker_id} does not exist.")

        # verify trade exists
        trade = await db.get(TradeCategory, object.trade_id)
        if trade is None:
            raise NoResultFound(f"Trade category with id {object.trade_id} does not exist.")

        # prevent duplicate worker-trade assignment
        existing = await self.exists(db=db, worker_id=object.worker_id, trade_id=object.trade_id)
        if existing:
            raise DuplicateValueException(f"Worker {object.worker_id} is already assigned to trade {object.trade_id}.")

        db_obj = WorkerTrade(worker_id=object.worker_id, trade_id=object.trade_id, skill_level=object.skill_level, worker=worker, trade=trade)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, object: WorkerTradeUpdate, **kwargs) -> WorkerTrade:
        worker_trade_id = kwargs.get("id")
        if not isinstance(worker_trade_id, int):
            raise ValueError("id must be a valid integer.")

        worker_trade = await db.get(WorkerTrade, worker_trade_id)
        if worker_trade is None:
            raise NoResultFound(f"WorkerTrade with id {worker_trade_id} does not exist.")

        return await super().update(db=db, object=object, id=worker_trade_id)

    async def delete(self, db: AsyncSession, id: int, **kwargs) -> None:
        worker_trade = await db.get(WorkerTrade, id)
        if worker_trade is None:
            raise NoResultFound(f"WorkerTrade with id {id} does not exist.")
        await db.delete(worker_trade)
        await db.commit()

    async def _get_worker_trades(self, db: AsyncSession, *, filter_column, filter_value: int, load_relationship, entity_class, entity_name: str) -> list[WorkerTrade]:
        """Private helper — validates entity exists then fetches related worker trades."""
        entity = await db.get(entity_class, filter_value)
        if entity is None:
            raise NoResultFound(f"{entity_name} with id {filter_value} does not exist.")

        result = await db.execute(
            select(WorkerTrade)
            .where(filter_column == filter_value)
            .options(selectinload(load_relationship))
        )
        return result.scalars().all()

    async def get_trades_for_worker(self, db: AsyncSession, worker_id: int) -> list[WorkerTrade]:
        """Get all trades assigned to a worker, with nested trade details."""
        return await self._get_worker_trades(
            db=db,
            filter_column=WorkerTrade.worker_id,
            filter_value=worker_id,
            load_relationship=WorkerTrade.trade,
            entity_class=WorkerProfile,
            entity_name="Worker profile",
        )

    async def get_workers_for_trade(self, db: AsyncSession, trade_id: int) -> list[WorkerTrade]:
        """Get all workers assigned to a trade, with nested worker details."""
        return await self._get_worker_trades(
            db=db,
            filter_column=WorkerTrade.trade_id,
            filter_value=trade_id,
            load_relationship=WorkerTrade.worker,
            entity_class=TradeCategory,
            entity_name="Trade category",
        )


crud_worker_trade = CRUDWorkerTrade(WorkerTrade)
