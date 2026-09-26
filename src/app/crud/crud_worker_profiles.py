from datetime import UTC, datetime
from typing import Any

from fastcrud import FastCRUD, PaginatedListResponse
from geoalchemy2 import Geography
from geoalchemy2.functions import ST_Distance, ST_DWithin, ST_MakePoint, ST_SetSRID
from sqlalchemy import and_, case, func, select
from sqlalchemy.engine.row import Row
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from ..models import User, WorkerProfile, WorkerTrade
from ..schemas.worker_profile import WorkerProfileCreate, WorkerProfileDelete, WorkerProfileFilter, WorkerProfileRead, WorkerProfileUpdate, WorkerProfileUpdateInternal, WorkerProfileWithTradesRead, WorkerSortBy


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
    ) -> PaginatedListResponse[WorkerProfileWithTradesRead]:
        """
        Public search endpoint for finding workers by multiple criteria.

        Ranking (ORDER BY built with SQLAlchemy Core expressions — case(),
        func.ST_Distance — rather than ORM-mapped properties, per AC):

          1. Availability boost   — is_available=True workers rank above
                                     is_available=False, always first.
          2. Verification boost   — within the same availability tier,
                                     is_verified=True ranks above unverified.
          3. sort_by tiebreaker   — distance (default), hourly_rate,
                                     experience, or rating, applied last as
                                     the final ordering key within tiers 1
                                     and 2.

        When latitude/longitude are absent, distance cannot be computed —
        sort_by=distance (the default) silently falls back to id ASC for
        determinism, and hourly_rate/experience sort_by values still work
        without coordinates.
        """
        stmt = (
            select(WorkerProfile)
            .options(
                joinedload(WorkerProfile.user),
                selectinload(WorkerProfile.worker_trades).selectinload(WorkerTrade.trade_category),
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

        if filters.trade_category_id is not None:
            stmt = stmt.join(
                WorkerTrade,
                and_(
                    WorkerTrade.worker_profile_id == WorkerProfile.id,
                    WorkerTrade.trade_category_id == filters.trade_category_id,
                ),
            )

        needs_user_join = filters.is_geo_search  # only geo search needs User.location
        distance_expr = None

        if filters.is_geo_search:
            stmt = stmt.join(User, User.id == WorkerProfile.user_id)
            customer_point = ST_SetSRID(
                ST_MakePoint(filters.longitude, filters.latitude), 4326
            )
            where_clauses.append(
                ST_DWithin(
                    User.location.cast(Geography),
                    customer_point.cast(Geography),
                    WorkerProfile.service_radius_km * 1000,
                )
            )
            # distance in km, used for sort_by=distance and returned as
            # distance_km on each result
            distance_expr = (
                    ST_Distance(User.location.cast(Geography), customer_point.cast(Geography)) / 1000
            )
            stmt = stmt.add_columns(distance_expr.label("distance_km"))

        if where_clauses:
            stmt = stmt.where(and_(*where_clauses))

        # ─── Composite ORDER BY — built with Core case()/func(), not ORM ──
        availability_boost = case(
            (WorkerProfile.is_available.is_(True), 0),
            else_=1,
        )
        verification_boost = case(
            (WorkerProfile.is_verified.is_(True), 0),
            else_=1,
        )

        order_by_clauses = [availability_boost.asc(), verification_boost.asc()]

        if filters.sort_by == WorkerSortBy.distance:
            if distance_expr is not None:
                order_by_clauses.append(distance_expr.asc())
            else:
                # no coordinates supplied — nothing to sort by distance,
                # fall back to a deterministic order
                order_by_clauses.append(WorkerProfile.id.asc())
        elif filters.sort_by == WorkerSortBy.hourly_rate:
            order_by_clauses.append(WorkerProfile.hourly_rate.asc())
        elif filters.sort_by == WorkerSortBy.experience:
            order_by_clauses.append(WorkerProfile.years_of_experience.desc())
        elif filters.sort_by == WorkerSortBy.rating:
            # workers with no reviews yet sort last, not first (NULLS FIRST is the DESC default)
            order_by_clauses.append(WorkerProfile.average_rating.desc().nulls_last())

        # final deterministic tiebreaker so pagination never reorders ties
        order_by_clauses.append(WorkerProfile.id.asc())

        stmt = stmt.order_by(*order_by_clauses)

        # ─── Count query — mirrors filters, no ordering/eager loads ──────
        count_stmt = select(func.count(WorkerProfile.id.distinct())).select_from(WorkerProfile)
        if filters.trade_category_id is not None:
            count_stmt = count_stmt.join(
                WorkerTrade,
                and_(
                    WorkerTrade.worker_profile_id == WorkerProfile.id,
                    WorkerTrade.trade_category_id == filters.trade_category_id,
                ),
            )
        if needs_user_join:
            count_stmt = count_stmt.join(User, User.id == WorkerProfile.user_id)
        if where_clauses:
            count_stmt = count_stmt.where(and_(*where_clauses))

        count_result = await db.execute(count_stmt)
        total_count = count_result.scalar() or 0

        stmt = stmt.offset(offset).limit(limit)
        result = await db.execute(stmt)
        if distance_expr is not None:
            rows = result.unique().all()
            data = [
                WorkerProfileWithTradesRead.model_validate(worker).model_copy(update={"distance_km": round(distance_km, 2)})
                for worker, distance_km in rows
            ]
        else:
            data = [WorkerProfileWithTradesRead.model_validate(w) for w in result.scalars().unique().all()]

        return PaginatedListResponse(
            data=data,
            total_count=total_count,
            has_more=(offset + len(data)) < total_count,
            items_per_page=limit,
        )


crud_worker_profiles = CRUDWorker(WorkerProfile)
