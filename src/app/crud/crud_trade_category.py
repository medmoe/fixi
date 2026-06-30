from typing import Any

from fastcrud import FastCRUD
from sqlalchemy import select
from sqlalchemy.engine import Row
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.trade_category import TradeCategory
from ..schemas.trade_category import (
    TradeCategoryCreate,
    TradeCategoryDelete,
    TradeCategoryRead,
    TradeCategoryUpdate,
    TradeCategoryUpdateInternal,
)


class CRUDTradeCategory(FastCRUD[
                            TradeCategory,
                            TradeCategoryCreate,
                            TradeCategoryUpdate,
                            TradeCategoryUpdateInternal,
                            TradeCategoryDelete,
                            TradeCategoryRead,
                        ]):
    async def create(self,
                     db: AsyncSession,
                     object: TradeCategoryCreate,
                     *,
                     commit: bool = True,
                     schema_to_select: type[TradeCategoryRead] | None = None,
                     return_as_model: bool = False,
                     **kwargs: Any) -> Any:
        # prevent duplicate names
        existing = await self.exists(db=db, name=object.name)
        if existing:
            raise ValueError(f"Trade category '{object.name}' already exists.")

        # validate parent exists if provided
        if object.parent_id is not None:
            parent = await db.get(TradeCategory, object.parent_id)
            if parent is None:
                raise NoResultFound(f"Parent category with id {object.parent_id} does not exist.")

        db_obj = TradeCategory(**object.model_dump(mode="json"))
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
            self,
            db: AsyncSession,
            object: TradeCategoryUpdate,
            **kwargs,
    ) -> dict[str, Any] | None:
        category_id = kwargs.get("id")
        if not isinstance(category_id, int):
            raise ValueError("id must be a valid integer.")

        # verify category exists
        category = await db.get(TradeCategory, category_id)
        if category is None:
            raise NoResultFound(f"Trade category with id {category_id} does not exist.")

        # validate parent exists if provided
        if object.parent_id is not None:
            if object.parent_id == category_id:
                raise ValueError("A category cannot be its own parent.")
            parent = await db.get(TradeCategory, object.parent_id)
            if parent is None:
                raise NoResultFound(f"Parent category with id {object.parent_id} does not exist.")

        # prevent duplicate name if name is being changed
        if object.name is not None and object.name != category.name:
            existing = await self.exists(db=db, name=object.name)
            if existing:
                raise ValueError(f"Trade category '{object.name}' already exists.")

        return await super().update(db=db, object=object, id=category_id)

    async def delete(
            self,
            db: AsyncSession,
            db_row: Row[Any] | None = None,
            allow_multiple: bool = False,
            commit: bool = True,
            filters: TradeCategoryDelete | None = None,
            **kwargs: Any,
    ) -> None:
        id_value = kwargs.get("id")
        hard = kwargs.get("hard", False)
        if not isinstance(id_value, int):
            raise ValueError("id must be provided as a keyword argument.")

        category = await db.get(TradeCategory, id_value)
        if category is None:
            raise NoResultFound(f"Trade category with id {id_value} does not exist.")

        has_children = await self.exists(db=db, parent_id=id_value)
        if has_children:
            raise ValueError(
                f"Cannot delete category {id_value} — it has subcategories. "
                "Delete or reassign them first."
            )

        if hard:
            await db.delete(category)
            await db.commit()
        else:
            raise NotImplementedError(
                "TradeCategory does not support soft delete. Use hard=True."
            )

    async def get_with_children(
            self,
            db: AsyncSession,
            id: int,
    ) -> dict:
        """Returns a category and all its direct children."""
        category = await db.get(TradeCategory, id)
        if category is None:
            raise NoResultFound(f"Trade category with id {id} does not exist.")

        result = await db.execute(
            select(TradeCategory).where(TradeCategory.parent_id == id)
        )
        children: list[TradeCategory] = list(result.scalars().all())

        return {
            "category": category,
            "children": children,
        }

    async def get_top_level(self, db: AsyncSession) -> list[TradeCategory]:
        """Returns all categories with no parent (root categories)."""
        result = await db.execute(
            select(TradeCategory).where(TradeCategory.parent_id.is_(None))
        )
        return list(result.scalars().all())


crud_trade_category = CRUDTradeCategory(TradeCategory)
