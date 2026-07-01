from typing import Any

from fastcrud import FastCRUD
from sqlalchemy import select
from sqlalchemy.engine import Row
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.trade_category import TradeCategory
from ..schemas.trade_category import TradeCategoryCreate, TradeCategoryDelete, TradeCategoryRead, TradeCategoryUpdate, TradeCategoryUpdateInternal, TradeCategoryWithChildren


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
                     schema_to_select: type[Any] | None = None,
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
            object: TradeCategoryUpdate | dict[str, Any],
            *,
            allow_multiple: bool = False,
            commit: bool = True,
            return_columns: list[str] | None = None,
            schema_to_select: type[Any] | None = None,
            return_as_model: bool = False,
            one_or_none: bool = False,
            **kwargs: Any,
    ) -> Any:
        update_data = object if isinstance(object, TradeCategoryUpdate) else TradeCategoryUpdate(**object)
        category_id = kwargs.get("id")
        if not isinstance(category_id, int):
            raise ValueError("id must be a valid integer.")

        # verify category exists
        category = await db.get(TradeCategory, category_id)
        if category is None:
            raise NoResultFound(f"Trade category with id {category_id} does not exist.")

        # validate parent exists if provided
        if update_data.parent_id is not None:
            if update_data.parent_id == category_id:
                raise ValueError("A category cannot be its own parent.")
            parent = await db.get(TradeCategory, update_data.parent_id)
            if parent is None:
                raise NoResultFound(f"Parent category with id {update_data.parent_id} does not exist.")

        # prevent duplicate name if name is being changed
        if update_data.name is not None and update_data.name != category.name:
            existing = await self.exists(db=db, name=update_data.name)
            if existing:
                raise ValueError(f"Trade category '{update_data.name}' already exists.")

        return await super().update(db=db, object=update_data, id=category_id)

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

    # crud/crud_trade_category.py

    async def get_nested(self, db: AsyncSession) -> list[TradeCategoryWithChildren]:
        """Returns all root categories with their children nested inside."""

        # fetch all categories in one query
        result = await db.execute(select(TradeCategory))
        all_categories: list[TradeCategory] = list(result.scalars().all())

        # build a lookup map by id
        category_map: dict[int, TradeCategoryWithChildren] = {
            cat.id: TradeCategoryWithChildren.model_validate(cat)
            for cat in all_categories
        }

        # nest children under their parents
        roots: list[TradeCategoryWithChildren] = []
        for category in category_map.values():
            if category.parent_id is None:
                roots.append(category)  # root category
            else:
                parent = category_map.get(category.parent_id)
                if parent is not None:
                    parent.children.append(category)  # nest under parent

        return roots


crud_trade_category = CRUDTradeCategory(TradeCategory)
