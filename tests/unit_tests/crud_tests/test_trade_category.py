import pytest
import pytest_asyncio
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.crud.crud_trade_category import crud_trade_category
from src.app.models.trade_category import TradeCategory
from src.app.schemas.trade_category import TradeCategoryCreate, TradeCategoryUpdate, TradeCategoryWithChildren


# ─── Factories ───────────────────────────────────────────────────────────────

def create_schema(**overrides) -> TradeCategoryCreate:
    """Valid TradeCategoryCreate schema — override any field to test edge cases."""
    defaults = {
        "name": "plumbing",
        "display_name": "Plumbing",
        "icon_name": "wrench",
        "parent_id": None,
    }
    return TradeCategoryCreate.model_validate({**defaults, **overrides})


async def create_test_category(
        db: AsyncSession,
        **overrides,
) -> TradeCategory:
    """Creates and persists a single TradeCategory."""
    return await crud_trade_category.create(db=db, object=create_schema(**overrides))


async def create_test_parent_category(db: AsyncSession) -> TradeCategory:
    """Creates a root category to use as a parent."""
    return await create_test_category(db, name="home-services", display_name="Home Services")


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def test_category(async_session: AsyncSession) -> TradeCategory:
    return await create_test_category(async_session)


@pytest_asyncio.fixture
async def test_parent_category(async_session: AsyncSession) -> TradeCategory:
    return await create_test_parent_category(async_session)


@pytest_asyncio.fixture
async def test_child_category(
        async_session: AsyncSession,
        test_parent_category: TradeCategory,
) -> TradeCategory:
    return await create_test_category(
        async_session,
        name="drain-cleaning",
        display_name="Drain Cleaning",
        parent_id=test_parent_category.id,
    )


# ─── TestCreate ───────────────────────────────────────────────────────────────

class TestCreate:
    async def test_create_returns_trade_category(self, async_session: AsyncSession):
        category = await create_test_category(async_session)
        assert isinstance(category, TradeCategory)

    async def test_create_persists_fields(self, async_session: AsyncSession):
        category = await create_test_category(
            async_session,
            name="electrical",
            display_name="Electrical",
            icon_name="bolt",
        )
        assert category.name == "electrical"
        assert category.display_name == "Electrical"
        assert category.icon_name == "bolt"
        assert category.parent_id is None

    async def test_create_assigns_id(self, async_session: AsyncSession):
        category = await create_test_category(async_session)
        assert category.id is not None
        assert isinstance(category.id, int)

    async def test_create_sets_created_at(self, async_session: AsyncSession):
        category = await create_test_category(async_session)
        assert category.created_at is not None

    async def test_create_sets_updated_at(self, async_session: AsyncSession):
        category = await create_test_category(async_session)
        assert category.updated_at is not None

    async def test_create_without_icon_name(self, async_session: AsyncSession):
        category = await create_test_category(async_session, icon_name=None)
        assert category.icon_name is None

    async def test_create_with_valid_parent(
            self,
            async_session: AsyncSession,
            test_parent_category: TradeCategory,
    ):
        child = await create_test_category(
            async_session,
            name="drain-cleaning",
            display_name="Drain Cleaning",
            parent_id=test_parent_category.id,
        )
        assert child.parent_id == test_parent_category.id

    async def test_create_fails_duplicate_name(self, async_session: AsyncSession):
        await create_test_category(async_session, name="plumbing")
        with pytest.raises(ValueError, match="already exists"):
            await create_test_category(async_session, name="plumbing")

    async def test_create_fails_nonexistent_parent(self, async_session: AsyncSession):
        with pytest.raises(NoResultFound):
            await create_test_category(async_session, parent_id=99999)


# ─── TestRead ─────────────────────────────────────────────────────────────────

class TestRead:
    class TestGetById:
        async def test_get_existing_category(
                self,
                async_session: AsyncSession,
                test_category: TradeCategory,
        ):
            result = await crud_trade_category.get(db=async_session, id=test_category.id)
            assert result is not None
            assert result["id"] == test_category.id
            assert result["name"] == test_category.name

        async def test_get_nonexistent_returns_none(self, async_session: AsyncSession):
            result = await crud_trade_category.get(db=async_session, id=99999)
            assert result is None

    class TestGetMulti:
        async def test_get_multi_returns_all(self, async_session: AsyncSession):
            await create_test_category(async_session, name="plumbing", display_name="Plumbing")
            await create_test_category(async_session, name="electrical", display_name="Electrical")
            await create_test_category(async_session, name="carpentry", display_name="Carpentry")
            result = await crud_trade_category.get_multi(db=async_session)
            assert result["total_count"] == 3

        async def test_get_multi_filter_by_parent_id(
                self,
                async_session: AsyncSession,
                test_parent_category: TradeCategory,
        ):
            await create_test_category(
                async_session, name="drain-cleaning",
                display_name="Drain Cleaning",
                parent_id=test_parent_category.id,
            )
            await create_test_category(
                async_session,
                name="pipe-repair",
                display_name="Pipe Repair",
                parent_id=test_parent_category.id,
            )
            result = await crud_trade_category.get_multi(
                db=async_session,
                parent_id=test_parent_category.id,
            )
            assert result["total_count"] == 2
            assert all(r["parent_id"] == test_parent_category.id for r in result["data"])

        async def test_get_multi_respects_limit(self, async_session: AsyncSession):
            await create_test_category(async_session, name="plumbing", display_name="Plumbing")
            await create_test_category(async_session, name="electrical", display_name="Electrical")
            await create_test_category(async_session, name="carpentry", display_name="Carpentry")
            result = await crud_trade_category.get_multi(db=async_session, limit=2)
            assert len(result["data"]) == 2

        async def test_get_multi_respects_offset(self, async_session: AsyncSession):
            await create_test_category(async_session, name="plumbing", display_name="Plumbing")
            await create_test_category(async_session, name="electrical", display_name="Electrical")
            await create_test_category(async_session, name="carpentry", display_name="Carpentry")
            result = await crud_trade_category.get_multi(db=async_session, offset=1)
            assert len(result["data"]) == 2  # 3 total - 1 skipped

    class TestGetTopLevel:
        async def test_returns_only_root_categories(
                self,
                async_session: AsyncSession,
                test_parent_category: TradeCategory,
        ):
            await create_test_category(
                async_session,
                name="drain-cleaning",
                display_name="Drain Cleaning",
                parent_id=test_parent_category.id,
            )
            result = await crud_trade_category.get_top_level(db=async_session)
            assert all(c.parent_id is None for c in result)

        async def test_returns_all_root_categories(self, async_session: AsyncSession):
            await create_test_category(async_session, name="plumbing", display_name="Plumbing")
            await create_test_category(async_session, name="electrical", display_name="Electrical")
            result = await crud_trade_category.get_top_level(db=async_session)
            assert len(result) == 2

    class TestGetWithChildren:
        async def test_returns_category_and_children(
                self,
                async_session: AsyncSession,
                test_parent_category: TradeCategory,
                test_child_category: TradeCategory,
        ):
            result = await crud_trade_category.get_with_children(
                db=async_session,
                id=test_parent_category.id,
            )
            assert result["category"].id == test_parent_category.id
            assert len(result["children"]) == 1
            assert result["children"][0].id == test_child_category.id

        async def test_returns_empty_children_for_leaf(
                self,
                async_session: AsyncSession,
                test_category: TradeCategory,
        ):
            result = await crud_trade_category.get_with_children(
                db=async_session,
                id=test_category.id,
            )
            assert result["children"] == []

        async def test_raises_for_nonexistent_category(self, async_session: AsyncSession):
            with pytest.raises(NoResultFound):
                await crud_trade_category.get_with_children(db=async_session, id=99999)


# ─── TestUpdate ───────────────────────────────────────────────────────────────

class TestUpdate:
    async def test_update_name(
            self,
            async_session: AsyncSession,
            test_category: TradeCategory,
    ):
        await crud_trade_category.update(
            db=async_session,
            object=TradeCategoryUpdate(name="updated-plumbing"),
            id=test_category.id,
        )
        updated = await crud_trade_category.get(db=async_session, id=test_category.id)
        assert updated["name"] == "updated-plumbing"

    async def test_update_display_name(
            self,
            async_session: AsyncSession,
            test_category: TradeCategory,
    ):
        await crud_trade_category.update(
            db=async_session,
            object=TradeCategoryUpdate(display_name="Updated Plumbing"),
            id=test_category.id,
        )
        updated = await crud_trade_category.get(db=async_session, id=test_category.id)
        assert updated["display_name"] == "Updated Plumbing"

    async def test_update_icon_name(
            self,
            async_session: AsyncSession,
            test_category: TradeCategory,
    ):
        await crud_trade_category.update(
            db=async_session,
            object=TradeCategoryUpdate(icon_name="new-icon"),
            id=test_category.id,
        )
        updated = await crud_trade_category.get(db=async_session, id=test_category.id)
        assert updated["icon_name"] == "new-icon"

    async def test_update_parent_id(
            self,
            async_session: AsyncSession,
            test_category: TradeCategory,
            test_parent_category: TradeCategory,
    ):
        await crud_trade_category.update(
            db=async_session,
            object=TradeCategoryUpdate(parent_id=test_parent_category.id),
            id=test_category.id,
        )
        updated = await crud_trade_category.get(db=async_session, id=test_category.id)
        assert updated["parent_id"] == test_parent_category.id

    async def test_update_fails_nonexistent_category(self, async_session: AsyncSession):
        with pytest.raises(NoResultFound):
            await crud_trade_category.update(
                db=async_session,
                object=TradeCategoryUpdate(name="ghost"),
                id=99999,
            )

    async def test_update_fails_duplicate_name(
            self,
            async_session: AsyncSession,
            test_category: TradeCategory,
    ):
        await create_test_category(async_session, name="electrical", display_name="Electrical")
        with pytest.raises(ValueError, match="already exists"):
            await crud_trade_category.update(
                db=async_session,
                object=TradeCategoryUpdate(name="electrical"),  # already taken
                id=test_category.id,
            )

    async def test_update_same_name_does_not_raise(
            self,
            async_session: AsyncSession,
            test_category: TradeCategory,
    ):
        """Updating with the same name should not raise a duplicate error."""
        await crud_trade_category.update(
            db=async_session,
            object=TradeCategoryUpdate(name=test_category.name),
            id=test_category.id,
        )
        updated = await crud_trade_category.get(db=async_session, id=test_category.id)
        assert updated["name"] == test_category.name

    async def test_update_fails_self_referential_parent(
            self,
            async_session: AsyncSession,
            test_category: TradeCategory,
    ):
        with pytest.raises(ValueError, match="cannot be its own parent"):
            await crud_trade_category.update(
                db=async_session,
                object=TradeCategoryUpdate(parent_id=test_category.id),
                id=test_category.id,
            )

    async def test_update_fails_nonexistent_parent(
            self,
            async_session: AsyncSession,
            test_category: TradeCategory,
    ):
        with pytest.raises(NoResultFound):
            await crud_trade_category.update(
                db=async_session,
                object=TradeCategoryUpdate(parent_id=99999),
                id=test_category.id,
            )


# ─── TestDelete ───────────────────────────────────────────────────────────────

class TestDelete:
    async def test_hard_delete_removes_category(
            self,
            async_session: AsyncSession,
            test_category: TradeCategory,
    ):
        await crud_trade_category.delete(db=async_session, id=test_category.id, hard=True)
        result = await crud_trade_category.get(db=async_session, id=test_category.id)
        assert result is None

    async def test_delete_fails_nonexistent_category(self, async_session: AsyncSession):
        with pytest.raises(NoResultFound):
            await crud_trade_category.delete(db=async_session, id=99999, hard=True)

    async def test_delete_fails_if_has_children(
            self,
            async_session: AsyncSession,
            test_parent_category: TradeCategory,
            test_child_category: TradeCategory,
    ):
        with pytest.raises(ValueError, match="subcategories"):
            await crud_trade_category.delete(
                db=async_session,
                id=test_parent_category.id,
                hard=True,
            )

    async def test_soft_delete_raises_not_implemented(
            self,
            async_session: AsyncSession,
            test_category: TradeCategory,
    ):
        with pytest.raises(NotImplementedError):
            await crud_trade_category.delete(
                db=async_session,
                id=test_category.id,
                hard=False,  # soft delete not supported
            )

    async def test_delete_child_does_not_delete_parent(
            self,
            async_session: AsyncSession,
            test_parent_category: TradeCategory,
            test_child_category: TradeCategory,
    ):
        await crud_trade_category.delete(
            db=async_session,
            id=test_child_category.id,
            hard=True,
        )
        parent = await crud_trade_category.get(db=async_session, id=test_parent_category.id)
        assert parent is not None


# ─── TestEdgeCases ────────────────────────────────────────────────────────────

class TestEdgeCases:
    async def test_name_at_max_length_persists(self, async_session: AsyncSession):
        long_name = "a" * 50
        category = await create_test_category(
            async_session,
            name=long_name,
            display_name="Long Name Category",
        )
        assert category.name == long_name

    async def test_display_name_at_max_length_persists(self, async_session: AsyncSession):
        long_display = "a" * 50
        category = await create_test_category(
            async_session,
            name="long-display",
            display_name=long_display,
        )
        assert category.display_name == long_display

    async def test_category_can_be_reassigned_to_different_parent(
            self,
            async_session: AsyncSession,
            test_child_category: TradeCategory,
    ):
        new_parent = await create_test_category(
            async_session,
            name="new-parent",
            display_name="New Parent",
        )
        await crud_trade_category.update(
            db=async_session,
            object=TradeCategoryUpdate(parent_id=new_parent.id),
            id=test_child_category.id,
        )
        updated = await crud_trade_category.get(db=async_session, id=test_child_category.id)
        assert updated["parent_id"] == new_parent.id

    async def test_category_parent_can_be_removed(
            self,
            async_session: AsyncSession,
            test_child_category: TradeCategory,
    ):
        """A child category can be promoted to root by setting parent_id to None."""
        await crud_trade_category.update(
            db=async_session,
            object=TradeCategoryUpdate(parent_id=None),
            id=test_child_category.id,
        )
        updated = await crud_trade_category.get(db=async_session, id=test_child_category.id)
        assert updated["parent_id"] is None

    async def test_multiple_children_same_parent(
            self,
            async_session: AsyncSession,
            test_parent_category: TradeCategory,
    ):
        await create_test_category(
            async_session,
            name="drain-cleaning",
            display_name="Drain Cleaning",
            parent_id=test_parent_category.id,
        )
        await create_test_category(
            async_session,
            name="pipe-repair",
            display_name="Pipe Repair",
            parent_id=test_parent_category.id,
        )
        result = await crud_trade_category.get_with_children(
            db=async_session,
            id=test_parent_category.id,
        )
        assert len(result["children"]) == 2

    async def test_nested_deeply_returns_grandchildren(
            self,
            async_session: AsyncSession,
            test_parent_category: TradeCategory,
    ):
        child = await create_test_category(
            async_session,
            name="drain-cleaning",
            display_name="Drain Cleaning",
            parent_id=test_parent_category.id,
        )
        grandchild = await create_test_category(
            async_session,
            name="snake-drain",
            display_name="Snake Drain",
            parent_id=child.id,
        )
        with_children = await crud_trade_category.get_with_children(
            db=async_session,
            id=test_parent_category.id,
        )
        # get_with_children is one level deep; grandchild is not a direct child of parent
        assert all(c.id != grandchild.id for c in with_children["children"])

    async def test_delete_only_child_allows_parent_deletion(
            self,
            async_session: AsyncSession,
            test_parent_category: TradeCategory,
            test_child_category: TradeCategory,
    ):
        # delete child first
        await crud_trade_category.delete(
            db=async_session,
            id=test_child_category.id,
            hard=True,
        )
        # now parent can be deleted
        await crud_trade_category.delete(
            db=async_session,
            id=test_parent_category.id,
            hard=True,
        )
        result = await crud_trade_category.get(db=async_session, id=test_parent_category.id)
        assert result is None


# ─── TestGetNested ────────────────────────────────────────────────────────────

class TestGetNested:
    async def test_returns_empty_list_when_no_categories(self, async_session: AsyncSession):
        result = await crud_trade_category.get_nested(db=async_session)
        assert result == []

    async def test_returns_tradecategorywithchildren_instances(
            self,
            async_session: AsyncSession,
            test_parent_category: TradeCategory,
    ):
        result = await crud_trade_category.get_nested(db=async_session)
        assert all(isinstance(r, TradeCategoryWithChildren) for r in result)

    async def test_only_root_categories_at_top_level(
            self,
            async_session: AsyncSession,
            test_parent_category: TradeCategory,
            test_child_category: TradeCategory,
    ):
        result = await crud_trade_category.get_nested(db=async_session)
        root_ids = [r.id for r in result]
        assert test_parent_category.id in root_ids
        assert test_child_category.id not in root_ids

    async def test_children_nested_under_parent(
            self,
            async_session: AsyncSession,
            test_parent_category: TradeCategory,
            test_child_category: TradeCategory,
    ):
        result = await crud_trade_category.get_nested(db=async_session)
        parent = next(r for r in result if r.id == test_parent_category.id)
        assert any(c.id == test_child_category.id for c in parent.children)

    async def test_leaf_categories_have_empty_children(
            self,
            async_session: AsyncSession,
            test_parent_category: TradeCategory,
            test_child_category: TradeCategory,
    ):
        result = await crud_trade_category.get_nested(db=async_session)
        parent = next(r for r in result if r.id == test_parent_category.id)
        leaf = next(c for c in parent.children if c.id == test_child_category.id)
        assert leaf.children == []

    async def test_multiple_children_under_same_parent(
            self,
            async_session: AsyncSession,
            test_parent_category: TradeCategory,
    ):
        await create_test_category(async_session, name="drain-cleaning", display_name="Drain Cleaning", parent_id=test_parent_category.id)
        await create_test_category(async_session, name="pipe-repair", display_name="Pipe Repair", parent_id=test_parent_category.id)
        result = await crud_trade_category.get_nested(db=async_session)
        parent = next(r for r in result if r.id == test_parent_category.id)
        assert len(parent.children) == 2

    async def test_multiple_root_categories(self, async_session: AsyncSession):
        await create_test_category(async_session, name="home-services", display_name="Home Services")
        await create_test_category(async_session, name="commercial", display_name="Commercial")
        result = await crud_trade_category.get_nested(db=async_session)
        assert len(result) == 2
        assert all(r.parent_id is None for r in result)

    async def test_grandchildren_nested_correctly(
            self,
            async_session: AsyncSession,
            test_parent_category: TradeCategory,
    ):
        child = await create_test_category(async_session, name="drain-cleaning", display_name="Drain Cleaning", parent_id=test_parent_category.id)
        grandchild = await create_test_category(async_session, name="snake-drain", display_name="Snake Drain", parent_id=child.id)

        result = await crud_trade_category.get_nested(db=async_session)
        parent_node = next(r for r in result if r.id == test_parent_category.id)
        child_node = next(c for c in parent_node.children if c.id == child.id)
        assert any(gc.id == grandchild.id for gc in child_node.children)

    async def test_orphaned_child_excluded_from_roots(
            self,
            async_session: AsyncSession,
            test_parent_category: TradeCategory,
            test_child_category: TradeCategory,
    ):
        result = await crud_trade_category.get_nested(db=async_session)
        assert len(result) == 1  # only the root, child is nested inside
