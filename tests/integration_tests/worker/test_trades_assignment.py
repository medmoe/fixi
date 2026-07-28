
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.crud.crud_trade_categories import crud_trade_category
from src.app.crud.crud_worker_profiles import crud_worker_profiles
from src.app.models.trade_category import TradeCategory
from src.app.models.user import User, UserRole
from src.app.models.worker_profile import WorkerProfile
from src.app.schemas.trade_category import TradeCategoryCreate
from src.app.schemas.worker_profile import WorkerProfileCreate
from tests.conftest import create_test_user


# ─── Factories ────────────────────────────────────────────────────────────────

async def create_worker_user(async_session: AsyncSession) -> User:
    return await create_test_user(async_session, role_type=UserRole.WORKER)


async def create_worker_profile(
        async_session: AsyncSession,
        user: User,
) -> WorkerProfile:
    object_in = WorkerProfileCreate.model_validate({
        "user_id": user.id,
        "bio": "Test worker",
        "hourly_rate": 50.00,
        "service_radius_km": 20,
        "is_available": True,
    })
    return await crud_worker_profiles.create(db=async_session, object=object_in)


async def create_trade_category(
        async_session: AsyncSession,
        name: str,
        display_name: str,
) -> TradeCategory:
    return await crud_trade_category.create(
        db=async_session,
        object=TradeCategoryCreate(name=name, display_name=display_name),
    )


async def get_auth_headers(async_client: AsyncClient, user: User) -> dict:
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"username_or_email": user.username, "password": "testpassword123"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def worker_user(async_session: AsyncSession) -> User:
    return await create_worker_user(async_session)


@pytest_asyncio.fixture
async def worker_profile(
        async_session: AsyncSession,
        worker_user: User,
) -> WorkerProfile:
    return await create_worker_profile(async_session, worker_user)


@pytest_asyncio.fixture
async def worker_auth_headers(
        async_client: AsyncClient,
        worker_user: User,
) -> dict:
    return await get_auth_headers(async_client, worker_user)


@pytest_asyncio.fixture
async def trade_categories(async_session: AsyncSession) -> list[TradeCategory]:
    return [
        await create_trade_category(async_session, f"trade-{i}", f"Trade {i}")
        for i in range(6)
    ]


# ─── Tests ────────────────────────────────────────────────────────────────────

class TestAssignTradeCategories:

    # ─── Authentication ───────────────────────────────────────────────────────

    async def test_unauthenticated_returns_401(
            self,
            async_client: AsyncClient,
            worker_profile: WorkerProfile,
    ):
        """Unauthenticated requests must be rejected."""
        response = await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": []},
        )
        assert response.status_code == 401

    # ─── Empty list ───────────────────────────────────────────────────────────

    async def test_empty_trade_category_ids_returns_current_assigned_trade_categories(
            self,
            async_client: AsyncClient,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
            worker_auth_headers: dict,
    ):
        """Empty list is valid — returns profile with existing trades unchanged."""
        response = await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": []},
            headers=worker_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data == []

    # ─── Nonexistent trades ───────────────────────────────────────────────────

    async def test_nonexistent_trade_category_ids_are_ignored(
            self,
            async_client: AsyncClient,
            worker_profile: WorkerProfile,
            worker_auth_headers: dict,
    ):
        """Trade IDs that don't exist in DB are silently ignored."""
        response = await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": [99999, 88888]},
            headers=worker_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data == []

    async def test_mix_of_valid_and_nonexistent_trade_category_ids(
            self,
            async_client: AsyncClient,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
            worker_auth_headers: dict,
            trade_categories: list[TradeCategory],
    ):
        """Valid IDs are assigned, nonexistent ones are ignored."""
        response = await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": [trade_categories[0].id, 99999, trade_categories[1].id]},
            headers=worker_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assigned_ids = [t["trade_category_id"] for t in data]
        assert trade_categories[0].id in assigned_ids
        assert trade_categories[1].id in assigned_ids
        assert len(assigned_ids) == 2

    # ─── Duplicate trades ─────────────────────────────────────────────────────

    async def test_already_assigned_trade_categories_are_ignored(
            self,
            async_client: AsyncClient,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
            worker_auth_headers: dict,
            trade_categories: list[TradeCategory],
    ):
        """Trades already assigned to the worker are silently ignored."""
        # assign trade[0] first
        await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": [trade_categories[0].id]},
            headers=worker_auth_headers,
        )

        # try to assign same trade again
        response = await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": [trade_categories[0].id]},
            headers=worker_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assigned_ids = [t["trade_category_id"] for t in data]
        # still only one assignment — no duplicate
        assert assigned_ids.count(trade_categories[0].id) == 1

    async def test_duplicate_ids_in_same_request_assigned_once(
            self,
            async_client: AsyncClient,
            worker_profile: WorkerProfile,
            worker_auth_headers: dict,
            trade_categories: list[TradeCategory],
    ):
        """Duplicate IDs within the same request are deduplicated."""
        response = await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": [trade_categories[0].id, trade_categories[0].id, trade_categories[0].id]},
            headers=worker_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assigned_ids = [t["trade_category_id"] for t in data]
        assert assigned_ids.count(trade_categories[0].id) == 1

    # ─── Max limit ────────────────────────────────────────────────────────────

    async def test_exceeding_5_trade_category_limit_returns_400(
            self,
            async_client: AsyncClient,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
            worker_auth_headers: dict,
            trade_categories: list[TradeCategory],
    ):
        """Assigning trades that would exceed 5 total rejects with 400."""
        # pre-assign 3 trades
        await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": [trade_categories[0].id, trade_categories[1].id, trade_categories[2].id]},
            headers=worker_auth_headers,
        )

        # try to assign 3 more — would make 6 total
        response = await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": [trade_categories[3].id, trade_categories[4].id, trade_categories[5].id]},
            headers=worker_auth_headers,
        )
        assert response.status_code == 400
        assert "limit" in response.json()["detail"].lower()

    async def test_exactly_5_trade_categories_succeeds(
            self,
            async_client: AsyncClient,
            worker_profile: WorkerProfile,
            worker_auth_headers: dict,
            trade_categories: list[TradeCategory],
    ):
        """Assigning exactly 5 trades total succeeds."""
        response = await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": [t.id for t in trade_categories[:5]]},
            headers=worker_auth_headers,
        )
        assert response.status_code == 200
        assert len(response.json()) == 5

    async def test_limit_check_excludes_already_assigned_trade_categories(
            self,
            async_client: AsyncClient,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
            worker_auth_headers: dict,
            trade_categories: list[TradeCategory],
    ):
        """Already assigned trades don't count toward the new assignment limit."""
        # pre-assign 4 trades
        await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": [t.id for t in trade_categories[:4]]},
            headers=worker_auth_headers,
        )

        # assign trade[0] again + trade[4] — only trade[4] is new
        # total would be 4 existing + 1 new = 5 ✅
        response = await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": [trade_categories[0].id, trade_categories[4].id]},
            headers=worker_auth_headers,
        )
        assert response.status_code == 200
        assert len(response.json()) == 5

    async def test_no_assignments_modified_on_limit_exceeded(
            self,
            async_client: AsyncClient,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
            worker_auth_headers: dict,
            trade_categories: list[TradeCategory],
    ):
        """On 400, existing assignments must remain unchanged."""
        # pre-assign 3 trades
        await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": [t.id for t in trade_categories[:3]]},
            headers=worker_auth_headers,
        )

        # try to add 3 more — exceeds limit → 400
        await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": [t.id for t in trade_categories[3:6]]},
            headers=worker_auth_headers,
        )

        # verify original 3 assignments are still intact
        profile_response = await async_client.get(
            f"/api/v1/worker-profile",
            headers=worker_auth_headers,
        )
        assigned_ids = [t["trade_category_id"] for t in profile_response.json()['trade_categories']]
        assert len(assigned_ids) == 3
        assert all(t.id in assigned_ids for t in trade_categories[:3])

    # ─── Response shape ───────────────────────────────────────────────────────

    async def test_response_includes_worker_profile_fields(
            self,
            async_client: AsyncClient,
            worker_profile: WorkerProfile,
            worker_auth_headers: dict,
            trade_categories: list[TradeCategory],
    ):
        """Response returns full worker profile with trades nested."""
        response = await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": [trade_categories[0].id]},
            headers=worker_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        for t in data:
            assert "id" in t
            assert "trade_category_id" in t
            assert "worker_profile_id" in t
            assert "skill_level" in t
            assert "trade_category" in t


    async def test_response_trade_categories_include_trade_category_details(
            self,
            async_client: AsyncClient,
            worker_profile: WorkerProfile,
            worker_auth_headers: dict,
            trade_categories: list[TradeCategory],
    ):
        """Each trade in response includes trade details."""
        response = await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": [trade_categories[0].id]},
            headers=worker_auth_headers,
        )
        assert response.status_code == 200
        trade = response.json()[0]
        assert "trade_category" in trade
        assert "parent_id" in trade["trade_category"]
        assert "created_at" in trade["trade_category"]
        assert "name" in trade["trade_category"]
        assert "display_name" in trade["trade_category"]
        assert "icon_name" in trade["trade_category"]


    async def test_existing_trade_categories_preserved_in_response(
            self,
            async_client: AsyncClient,
            async_session: AsyncSession,
            worker_profile: WorkerProfile,
            worker_auth_headers: dict,
            trade_categories: list[TradeCategory],
    ):
        """Response includes both existing and newly assigned trades."""
        # assign first trade
        await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": [trade_categories[0].id]},
            headers=worker_auth_headers,
        )

        # assign second trade
        response = await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": [trade_categories[1].id]},
            headers=worker_auth_headers,
        )
        assigned_ids = [t["trade_category_id"] for t in response.json()]
        assert trade_categories[0].id in assigned_ids  # existing preserved
        assert trade_categories[1].id in assigned_ids  # new one added
        assert len(assigned_ids) == 2

    # ─── Nonexistent worker ───────────────────────────────────────────────────

    async def test_nonexistent_worker_profile_returns_404(
            self,
            async_client: AsyncClient,
            worker_auth_headers: dict,
    ):
        """Requesting assignment for nonexistent worker returns 404."""
        response = await async_client.post(
            "/api/v1/worker-profile/trade-categories/assign",
            json={"trade_category_ids": []},
            headers=worker_auth_headers,
        )
        assert response.status_code == 404
