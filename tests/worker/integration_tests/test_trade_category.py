import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_test_trade_category

ENDPOINT = "/api/v1/trade-categories"


# ===========================================================================
# GET /api/v1/trade-categories  (flat, default)
# ===========================================================================

class TestGetFlatTradeCategories:
    """Flat list — returns ALL categories regardless of hierarchy."""

    async def test_returns_200(self, async_client: AsyncClient):
        response = await async_client.get(ENDPOINT)
        assert response.status_code == 200

    async def test_returns_list(self, async_client: AsyncClient):
        response = await async_client.get(ENDPOINT)
        assert isinstance(response.json(), list)

    async def test_empty_when_no_categories(self, async_client: AsyncClient):
        response = await async_client.get(ENDPOINT)
        assert response.json() == []

    async def test_response_shape(
        self,
        async_client: AsyncClient,
        async_session: AsyncSession,
    ):
        await create_test_trade_category(async_session)
        response = await async_client.get(ENDPOINT)
        item = response.json()[0]
        assert "id" in item
        assert "name" in item
        assert "display_name" in item
        assert "icon_name" in item
        assert "parent_id" in item
        assert "created_at" in item
        assert "children" in item  # TradeCategoryWithChildren

    async def test_field_values_match_db(
        self,
        async_client: AsyncClient,
        async_session: AsyncSession,
    ):
        db_category = await create_test_trade_category(async_session)
        response = await async_client.get(ENDPOINT)
        item = response.json()[0]
        assert item["id"] == db_category.id
        assert item["name"] == db_category.name
        assert item["display_name"] == db_category.display_name
        assert item["parent_id"] is None

    async def test_flat_response_includes_subcategories(
        self,
        async_client: AsyncClient,
        async_session: AsyncSession,
    ):
        parent = await create_test_trade_category(async_session)
        child = await create_test_trade_category(async_session, parent_id=parent.id)

        response = await async_client.get(ENDPOINT)
        ids = [item["id"] for item in response.json()]
        assert parent.id in ids
        assert child.id in ids

    async def test_flat_children_field_is_empty_list(
        self,
        async_client: AsyncClient,
        async_session: AsyncSession,
    ):
        parent = await create_test_trade_category(async_session)
        await create_test_trade_category(async_session, parent_id=parent.id)

        response = await async_client.get(ENDPOINT)
        for item in response.json():
            assert item["children"] == []

    async def test_returns_all_categories(
        self,
        async_client: AsyncClient,
        async_session: AsyncSession,
    ):
        await create_test_trade_category(async_session)
        await create_test_trade_category(async_session)
        await create_test_trade_category(async_session)

        response = await async_client.get(ENDPOINT)
        assert response.status_code == 200
        assert len(response.json()) == 3

    async def test_cache_control_header_set(
        self,
        async_client: AsyncClient,
    ):
        response = await async_client.get(ENDPOINT)
        assert "Cache-Control" in response.headers
        assert "public" in response.headers["Cache-Control"]


# ===========================================================================
# GET /api/v1/trade-categories?nested=true  (hierarchical tree)
# ===========================================================================

class TestGetNestedTradeCategories:
    """Nested tree — roots at top level, children embedded."""

    async def test_returns_200(self, async_client: AsyncClient):
        response = await async_client.get(ENDPOINT, params={"nested": "true"})
        assert response.status_code == 200

    async def test_returns_list(self, async_client: AsyncClient):
        response = await async_client.get(ENDPOINT, params={"nested": "true"})
        assert isinstance(response.json(), list)

    async def test_empty_when_no_categories(self, async_client: AsyncClient):
        response = await async_client.get(ENDPOINT, params={"nested": "true"})
        assert response.json() == []

    async def test_response_shape(
        self,
        async_client: AsyncClient,
        async_session: AsyncSession,
    ):
        await create_test_trade_category(async_session)
        response = await async_client.get(ENDPOINT, params={"nested": "true"})
        item = response.json()[0]
        assert "id" in item
        assert "name" in item
        assert "display_name" in item
        assert "parent_id" in item
        assert "children" in item
        assert isinstance(item["children"], list)

    async def test_only_roots_at_top_level(
        self,
        async_client: AsyncClient,
        async_session: AsyncSession,
    ):
        parent = await create_test_trade_category(async_session)
        child = await create_test_trade_category(async_session, parent_id=parent.id)

        response = await async_client.get(ENDPOINT, params={"nested": "true"})
        data = response.json()
        top_level_ids = [item["id"] for item in data]
        assert parent.id in top_level_ids
        assert child.id not in top_level_ids

    async def test_child_nested_under_parent(
        self,
        async_client: AsyncClient,
        async_session: AsyncSession,
    ):
        parent = await create_test_trade_category(async_session)
        child = await create_test_trade_category(async_session, parent_id=parent.id)

        response = await async_client.get(ENDPOINT, params={"nested": "true"})
        parent_item = next(item for item in response.json() if item["id"] == parent.id)
        child_ids = [c["id"] for c in parent_item["children"]]
        assert child.id in child_ids

    async def test_leaf_node_has_empty_children(
        self,
        async_client: AsyncClient,
        async_session: AsyncSession,
    ):
        parent = await create_test_trade_category(async_session)
        await create_test_trade_category(async_session, parent_id=parent.id)

        response = await async_client.get(ENDPOINT, params={"nested": "true"})
        parent_item = next(item for item in response.json() if item["id"] == parent.id)
        leaf = parent_item["children"][0]
        assert leaf["children"] == []

    async def test_multiple_children_under_same_parent(
        self,
        async_client: AsyncClient,
        async_session: AsyncSession,
    ):
        parent = await create_test_trade_category(async_session)
        await create_test_trade_category(async_session, parent_id=parent.id)
        await create_test_trade_category(async_session, parent_id=parent.id)

        response = await async_client.get(ENDPOINT, params={"nested": "true"})
        parent_item = next(item for item in response.json() if item["id"] == parent.id)
        assert len(parent_item["children"]) == 2

    async def test_multiple_root_categories(
        self,
        async_client: AsyncClient,
        async_session: AsyncSession,
    ):
        await create_test_trade_category(async_session)
        await create_test_trade_category(async_session)

        response = await async_client.get(ENDPOINT, params={"nested": "true"})
        data = response.json()
        assert len(data) == 2
        assert all(item["parent_id"] is None for item in data)

    async def test_grandchildren_nested_correctly(
        self,
        async_client: AsyncClient,
        async_session: AsyncSession,
    ):
        parent = await create_test_trade_category(async_session)
        child = await create_test_trade_category(async_session, parent_id=parent.id)
        grandchild = await create_test_trade_category(async_session, parent_id=child.id)

        response = await async_client.get(ENDPOINT, params={"nested": "true"})
        parent_item = next(item for item in response.json() if item["id"] == parent.id)
        child_item = next(c for c in parent_item["children"] if c["id"] == child.id)
        grandchild_ids = [gc["id"] for gc in child_item["children"]]
        assert grandchild.id in grandchild_ids

    async def test_cache_control_header_set(
        self,
        async_client: AsyncClient,
    ):
        response = await async_client.get(ENDPOINT, params={"nested": "true"})
        assert "Cache-Control" in response.headers
        assert "public" in response.headers["Cache-Control"]
