from datetime import UTC, datetime
from typing import Any

from fastcrud import FastCRUD
from sqlalchemy import and_, select, func
from sqlalchemy.engine.row import Row
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from ..models import User, WorkerProfile, WorkerTrade
from ..schemas.worker_profile import (
    WorkerProfileCreate,
    WorkerProfileDelete,
    WorkerProfileRead,
    WorkerProfileUpdate,
    WorkerProfileUpdateInternal,
    WorkerProfileFilter,
    WorkerProfileWithTradesRead,
)


class CRUDWorker(FastCRUD[
    WorkerProfile,
    WorkerProfileCreate,
    WorkerProfileUpdate | WorkerProfileUpdateInternal,
    WorkerProfileUpdateInternal,
    WorkerProfileDelete,
    WorkerProfileRead
]):
    async def delete(
            self,
            db: AsyncSession,
            db_row: Row | None = None,
            allow_multiple: bool = False,
            commit: bool = True,
            filters: WorkerProfileDelete | None = None,
            **kwargs: Any,
    ) -> None:
        user_id = kwargs.get("user_id")
        hard = kwargs.get("hard", False)
        if not isinstance(user_id, int):
            raise ValueError("user_id must be provided as a keyword argument.")

        user = await db.get(User, user_id)
        if not user:
            raise NoResultFound("User does not exist.")

        if not await self.exists(db=db, user_id=user_id):
            raise NoResultFound("Worker profile does not exist.")

        if hard:
            await db.delete(user)
        else:
            user.is_deleted = True
            user.deleted_at = datetime.now(UTC)

        await db.commit()

    async def update(
            self,
            db: AsyncSession,
            object: WorkerProfileUpdate | WorkerProfileUpdateInternal | dict[str, Any],
            **kwargs: Any,
    ) -> Any:
        user_id = kwargs.get("user_id")
        if not isinstance(user_id, int):
            raise ValueError("user_id must be provided as a keyword argument.")

        user = await db.get(User, user_id)
        if not user:
            raise NoResultFound("User does not exist.")

        user.updated_at = datetime.now(UTC)
        await db.flush()

        return await super().update(db=db, object=object, **kwargs)

    async def search_workers(
            self,
            db: AsyncSession,
            filters: WorkerProfileFilter,
            offset: int = 0,
            limit: int = 20,
    ) -> dict:
        """
        Public search endpoint for finding workers by multiple criteria.
        Returns paginated response with WorkerProfileWithTradesRead shape,
        including user info (name, email) and nested trade categories.
        """
        stmt = (
            select(WorkerProfile)
            .options(
                joinedload(WorkerProfile.user),  # one-to-one — safe with joinedload
                selectinload(WorkerProfile.worker_trades)
                .selectinload(WorkerTrade.trade_category),  # one-to-many — separate query, no duplication
            )
        )

        where_clauses = []
        if filters.min_hourly_rate is not None:
            where_clauses.append(WorkerProfile.hourly_rate >= filters.min_hourly_rate)
        if filters.max_hourly_rate is not None:
            where_clauses.append(WorkerProfile.hourly_rate <= filters.max_hourly_rate)
        if filters.min_years_of_experience is not None:
            where_clauses.append(WorkerProfile.years_of_experience >= filters.min_years_of_experience)
        if filters.max_years_of_experience is not None:
            where_clauses.append(WorkerProfile.years_of_experience <= filters.max_years_of_experience)
        if filters.service_radius_km is not None:
            where_clauses.append(WorkerProfile.service_radius_km >= filters.service_radius_km)
        if filters.is_available is not None:
            where_clauses.append(WorkerProfile.is_available == filters.is_available)
        if filters.is_verified is not None:
            where_clauses.append(WorkerProfile.is_verified == filters.is_verified)

        # trade_category_id filter — join only when needed, filtered inline so it
        # doesn't require WorkerTrade to also appear in where_clauses separately
        if filters.trade_category_id is not None:
            stmt = stmt.join(
                WorkerTrade,
                and_(
                    WorkerTrade.worker_profile_id == WorkerProfile.id,
                    WorkerTrade.trade_category_id == filters.trade_category_id,
                ),
            )

        if where_clauses:
            stmt = stmt.where(and_(*where_clauses))

        stmt = stmt.order_by(WorkerProfile.id.asc())

        # ── count query — mirrors filters, no eager loads, deduplicated ──
        count_stmt = select(func.count(WorkerProfile.id.distinct())).select_from(WorkerProfile)
        if filters.trade_category_id is not None:
            count_stmt = count_stmt.join(
                WorkerTrade,
                and_(
                    WorkerTrade.worker_profile_id == WorkerProfile.id,
                    WorkerTrade.trade_category_id == filters.trade_category_id,
                ),
            )
        if where_clauses:
            count_stmt = count_stmt.where(and_(*where_clauses))

        count_result = await db.execute(count_stmt)
        total_count = count_result.scalar() or 0

        stmt = stmt.offset(offset).limit(limit)
        result = await db.execute(stmt)
        workers = result.scalars().unique().all()  # unique() dedupes rows from the trade_category_id join

        data = [WorkerProfileWithTradesRead.model_validate(w) for w in workers]

        return {
            "data": data,
            "total_count": total_count,
            "has_more": (offset + len(data)) < total_count,
            "items_per_page": limit,
        }


crud_worker_profiles = CRUDWorker(WorkerProfile)
