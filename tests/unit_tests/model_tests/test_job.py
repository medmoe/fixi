from datetime import datetime, UTC
from decimal import Decimal
from typing import Any

import pytest
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, InternalError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.app.core.security import get_password_hash
from src.app.models import Job, JobStatus, TradeCategory, User

# ————— helpers —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

LOCATION = ST_SetSRID(ST_MakePoint(-74.006, 40.7128), 4326)


def create_trade_category_payload(**overrides) -> dict[str, Any]:
    return {
        "name": "plumbing",
        "display_name": "Plumbing",
        "icon_name": "fa-solid fa-plumber",
        **overrides
    }


def create_user_payload(**overrides) -> dict[str, Any]:
    return {
        "name": "John Doe",
        "username": "johndoe",
        "email": "johndoe@test.com",
        "hashed_password": get_password_hash("SecurePass123**"),
        **overrides
    }


def create_job_payload(**overrides) -> dict[str, Any]:
    return {
        "title": "Fix leaky faucet",
        "description": "Kitchen faucet is dripping",
        "location": LOCATION,
        "display_location": "123 Main St, New York, NY",
        "budget_min": Decimal("100.00"),
        "budget_max": Decimal("500.00"),
        **overrides
    }


# ————— tests —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

class TestJobModel:
    """ Test Job model """

    class TestHappyPath:
        @pytest.mark.unit
        async def test_create_job_with_all_fields_pass(self, async_session: AsyncSession):
            trade_category = TradeCategory(**create_trade_category_payload())
            user = User(**create_user_payload())
            async_session.add_all([trade_category, user])
            await async_session.commit()

            job = Job(**create_job_payload(trade_category_id=trade_category.id, user_id=user.id))
            async_session.add(job)
            await async_session.commit()
            await async_session.refresh(job)

            assert job.id is not None
            assert job.title == "Fix leaky faucet"
            assert job.description == "Kitchen faucet is dripping"
            assert job.trade_category_id == trade_category.id
            assert job.user_id == user.id

        @pytest.mark.unit
        async def test_create_job_with_minimal_fields_pass(self, async_session: AsyncSession):
            trade_category = TradeCategory(**create_trade_category_payload())
            user = User(**create_user_payload())
            async_session.add_all([trade_category, user])
            await async_session.commit()

            job = Job(
                title="Quick repair",
                trade_category_id=trade_category.id,
                description="Fix leaky faucet",
                budget_min=Decimal(100.0),
                budget_max=Decimal(200.0),
                user_id=user.id,
            )
            async_session.add(job)
            await async_session.commit()
            await async_session.refresh(job)

            assert job.id is not None
            assert job.title == "Quick repair"
            assert job.description == "Fix leaky faucet"
            assert job.display_location is None
            assert job.budget_min == Decimal(100)
            assert job.budget_max == Decimal(200)

    class TestDefaults:
        @pytest.mark.unit
        async def test_job_defaults(self, async_session: AsyncSession):
            trade_category = TradeCategory(**create_trade_category_payload())
            user = User(**create_user_payload())
            async_session.add_all([trade_category, user])
            await async_session.commit()

            job = Job(**create_job_payload(trade_category_id=trade_category.id, user_id=user.id))
            async_session.add(job)
            await async_session.commit()
            await async_session.refresh(job)

            assert job.status == JobStatus.OPEN
            assert job.uuid is not None
            assert job.created_at is not None
            assert job.updated_at is not None
            assert job.deleted_at is None
            assert job.is_deleted is False

    class TestUniqueFields:
        @pytest.mark.unit
        async def test_job_uuid_is_unique(self, async_session: AsyncSession):
            trade_category = TradeCategory(**create_trade_category_payload())
            user = User(**create_user_payload())
            async_session.add_all([trade_category, user])
            await async_session.commit()

            job1 = Job(**create_job_payload(trade_category_id=trade_category.id, user_id=user.id))
            job2 = Job(**create_job_payload(title="Second job", trade_category_id=trade_category.id, user_id=user.id))
            async_session.add_all([job1, job2])
            await async_session.commit()
            assert job1.uuid != job2.uuid

    class TestCheckConstraints:
        @pytest.mark.unit
        async def test_job_budget_max_less_than_min_fails(self, async_session: AsyncSession):
            trade_category = TradeCategory(**create_trade_category_payload())
            user = User(**create_user_payload())
            async_session.add_all([trade_category, user])
            await async_session.commit()

            job = Job(**create_job_payload(
                trade_category_id=trade_category.id,
                user_id=user.id,
                budget_min=Decimal("500.00"),
                budget_max=Decimal("100.00")
            ))
            async_session.add(job)
            with pytest.raises(IntegrityError):
                await async_session.commit()

        @pytest.mark.unit
        async def test_job_budget_nulls_allowed(self, async_session: AsyncSession):
            trade_category = TradeCategory(**create_trade_category_payload())
            user = User(**create_user_payload())
            async_session.add_all([trade_category, user])
            await async_session.commit()

            job = Job(**create_job_payload(
                trade_category_id=trade_category.id,
                user_id=user.id,
                budget_min=None,
                budget_max=None
            ))
            async_session.add(job)
            await async_session.commit()
            await async_session.refresh(job)
            assert job.budget_min is None
            assert job.budget_max is None

    class TestRelationships:
        @pytest.mark.unit
        async def test_job_belongs_to_user(self, async_session: AsyncSession):
            trade_category = TradeCategory(**create_trade_category_payload())
            user = User(**create_user_payload())
            async_session.add_all([trade_category, user])
            await async_session.commit()

            job = Job(**create_job_payload(trade_category_id=trade_category.id, user_id=user.id))
            async_session.add(job)
            await async_session.commit()
            result = await async_session.execute(
                select(Job)
                .where(Job.id == job.id)
                .options(joinedload(Job.user))
            )
            job = result.scalar_one()
            assert job.user is not None
            assert job.user_id == user.id

        @pytest.mark.unit
        async def test_job_belongs_to_trade_category(self, async_session: AsyncSession):
            trade_category = TradeCategory(**create_trade_category_payload())
            user = User(**create_user_payload())
            async_session.add_all([trade_category, user])
            await async_session.commit()

            job = Job(**create_job_payload(trade_category_id=trade_category.id, user_id=user.id))
            async_session.add(job)
            await async_session.commit()
            result = await async_session.execute(
                select(Job)
                .where(Job.id == job.id)
                .options(joinedload(Job.trade_category))
            )
            job = result.scalar_one()
            assert job.trade_category is not None
            assert job.trade_category_id == trade_category.id

    class TestDataPersistence:
        @pytest.mark.unit
        async def test_job_status_can_be_updated(self, async_session: AsyncSession):
            trade_category = TradeCategory(**create_trade_category_payload())
            user = User(**create_user_payload())
            async_session.add_all([trade_category, user])
            await async_session.commit()

            job = Job(**create_job_payload(trade_category_id=trade_category.id, user_id=user.id))
            async_session.add(job)
            await async_session.commit()
            await async_session.refresh(job)

            job.status = JobStatus.IN_PROGRESS
            await async_session.commit()
            await async_session.refresh(job)
            assert job.status == JobStatus.IN_PROGRESS

    class TestDeleteFields:
        @pytest.mark.unit
        async def test_soft_delete_can_be_updated(self, async_session: AsyncSession):
            trade_category = TradeCategory(**create_trade_category_payload())
            user = User(**create_user_payload())
            async_session.add_all([trade_category, user])
            await async_session.commit()

            job = Job(**create_job_payload(trade_category_id=trade_category.id, user_id=user.id))
            async_session.add(job)
            await async_session.commit()
            await async_session.refresh(job)

            job.is_deleted = True
            job.deleted_at = datetime.now(UTC)
            await async_session.commit()
            await async_session.refresh(job)
            assert job.is_deleted is True
            assert job.deleted_at is not None

    class TestTimestampsPersistence:
        @pytest.mark.unit
        async def test_updated_at(self, async_session: AsyncSession):
            trade_category = TradeCategory(**create_trade_category_payload())
            user = User(**create_user_payload())
            async_session.add_all([trade_category, user])
            await async_session.commit()

            job = Job(**create_job_payload(trade_category_id=trade_category.id, user_id=user.id))
            async_session.add(job)
            await async_session.commit()

            now = datetime.now(UTC)
            job.updated_at = now
            await async_session.commit()
            await async_session.refresh(job)
            assert job.updated_at == now

    class TestLocationField:
        @pytest.mark.unit
        async def test_create_job_with_location_pass(self, async_session: AsyncSession):
            trade_category = TradeCategory(**create_trade_category_payload())
            user = User(**create_user_payload())
            async_session.add_all([trade_category, user])
            await async_session.commit()

            job = Job(**create_job_payload(trade_category_id=trade_category.id, user_id=user.id, location=LOCATION))
            async_session.add(job)
            await async_session.commit()
            await async_session.refresh(job)
            assert job is not None

        @pytest.mark.unit
        async def test_create_job_fail_with_invalid_location(self, async_session: AsyncSession):
            trade_category = TradeCategory(**create_trade_category_payload())
            user = User(**create_user_payload())
            async_session.add_all([trade_category, user])
            await async_session.commit()

            job = Job(**create_job_payload(trade_category_id=trade_category.id, user_id=user.id, location="invalid location"))
            async_session.add(job)
            with pytest.raises(InternalError):
                await async_session.commit()
