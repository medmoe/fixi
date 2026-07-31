from datetime import datetime, UTC
from typing import Any

import pytest
from sqlalchemy.exc import IntegrityError, InternalError
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint

from src.app.models import User, UserRole, Tier


# ————— helpers —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

LOCATION = ST_SetSRID(ST_MakePoint(-74.006, 40.7128), 4326)

def create_user_payload(**overrides) -> dict[str, Any]:
    return {
        "name": "John Doe",
        "username": "johndoe",
        "email": "johndoe@example.com",
        "hashed_password": "hashed_password",
        **overrides
    }

def create_second_user_payload(**overrides) -> dict[str, Any]:
    return {
        "name": "Jane Doe",
        "username": "janedoe",
        "email": "janedoe@example.com",
        "hashed_password": "hashed_password",
        **overrides
    }


# ————— tests —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

class TestUserModel:
    """ Test User model """

    class TestHappyPath:
        @pytest.mark.unit
        async def test_create_user_with_all_fields_pass(self, async_session: AsyncSession):
            user = User(**create_user_payload())
            async_session.add(user)
            await async_session.commit()
            await async_session.refresh(user)

            assert user.id is not None
            assert user.name == "John Doe"
            assert user.username == "johndoe"
            assert user.email == "johndoe@example.com"

        # ————— default values are populated —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
        @pytest.mark.unit
        async def test_user_defaults(self, async_session: AsyncSession):
            user = User(**create_user_payload())
            async_session.add(user)
            await async_session.commit()
            await async_session.refresh(user)

            assert user.profile_image_url is not None
            assert user.location is None
            assert user.uuid is not None
            assert user.created_at is not None
            assert user.updated_at is None
            assert user.deleted_at is None
            assert user.is_deleted is False
            assert user.is_superuser is False
            assert user.role_type == UserRole.CUSTOMER
            assert user.token_version == 1
            assert user.tier_id is None

    class TestUniqueFields:
        @pytest.mark.unit
        async def test_user_uuid_is_unique(self, async_session: AsyncSession):
            user1 = User(**create_user_payload())
            user2 = User(**create_second_user_payload())
            async_session.add_all([user1, user2])
            await async_session.commit()
            assert user1.uuid != user2.uuid

        @pytest.mark.unit
        async def test_user_username_is_unique(self, async_session: AsyncSession):
            user1 = User(**create_user_payload())
            user2 = User(**create_second_user_payload(username=user1.username))
            async_session.add_all([user1, user2])
            with pytest.raises(IntegrityError):
                await async_session.commit()

        @pytest.mark.unit
        async def test_user_email_is_unique(self, async_session: AsyncSession):
            user1 = User(**create_user_payload())
            user2 = User(**create_second_user_payload(email=user1.email))
            async_session.add_all([user1, user2])
            with pytest.raises(IntegrityError):
                await async_session.commit()

    class TestDataPersistence:
        @pytest.mark.unit
        async def test_worker_role(self, async_session: AsyncSession):
            user = User(**create_user_payload(role_type=UserRole.WORKER))
            async_session.add(user)
            await async_session.commit()
            await async_session.refresh(user)

            assert user.role_type == UserRole.WORKER

        @pytest.mark.unit
        async def test_superuser_flag(self, async_session: AsyncSession):
            user = User(**create_user_payload(is_superuser=True))
            async_session.add(user)
            await async_session.commit()
            await async_session.refresh(user)

            assert user.is_superuser is True

    class TestDeleteFields:
        @pytest.mark.unit
        async def test_soft_delete_can_be_updated(self, async_session: AsyncSession):
            user = User(**create_user_payload())
            async_session.add(user)
            await async_session.commit()
            await async_session.refresh(user)
            user.is_deleted = True
            user.deleted_at = datetime.now(UTC)
            await async_session.commit()
            await async_session.refresh(user)
            assert user.is_deleted is True
            assert user.deleted_at is not None

    class TestTimestampsPersistence:
        @pytest.mark.unit
        async def test_updated_at(self, async_session: AsyncSession):
            user = User(**create_user_payload())
            async_session.add(user)
            await async_session.commit()
            now = datetime.now(UTC)
            user.updated_at = now
            await async_session.commit()
            await async_session.refresh(user)
            assert user.updated_at == now

    class TierRelationshipWorks:
        @pytest.mark.unit
        async def test_user_belongs_to_tier(self, async_session: AsyncSession):
            tier = Tier(name="Gold")

            async_session.add(tier)
            await async_session.commit()

            user = User(**create_user_payload(tier_id=tier.id))
            async_session.add(user)
            await async_session.commit()
            await async_session.refresh(user)
            assert user.tier is not None
            assert user.tier_id == tier.id

        @pytest.mark.unit
        async def test_user_can_exist_without_tier(self, async_session: AsyncSession):
            user = User(**create_user_payload())
            async_session.add(user)
            await async_session.commit()
            await async_session.refresh(user)
            assert user.tier is None

    class TestLocationField:
        @pytest.mark.unit
        async def test_create_user_with_location_pass(self, async_session: AsyncSession):
            user = User(**create_user_payload(location=LOCATION))
            async_session.add(user)
            await async_session.commit()
            await async_session.refresh(user)
            assert user is not None

        @pytest.mark.unit
        async def test_create_user_fail_with_invalid_location(self, async_session: AsyncSession):
            user = User(**create_user_payload(location= "invalid location"))
            async_session.add(user)
            with pytest.raises(InternalError):
                await async_session.commit()

