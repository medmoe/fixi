import pytest
from fastcrud.exceptions.http_exceptions import NotFoundException
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.exceptions.http_exceptions import DuplicateValueException
from src.app.core.security import authenticate_user
from src.app.crud.crud_users import crud_users
from src.app.models import User
from src.app.schemas.user import UserRead, UserUpdate, UserDetail, UserPasswordUpdate


# ─── Helpers ──────────────────────────────────────────────────────────────────

def create_update_payload(**overrides) -> dict:
    """ Valid UserBase schema — override any field to test edge cases."""
    return {
        "name": "John Doe",
        "username": "johndoe",
        "email": "johndoe@test.com",
        **overrides
    }


# ─── Test User Update ──────────────────────────────────────────────────────────────────

class TestUserUpdate:
    @pytest.mark.unit
    async def test_successful_user_update(self, async_session: AsyncSession, test_user: User):
        schema = UserUpdate.model_validate(create_update_payload(name="Updated name"))
        updated_user = await crud_users.update(db=async_session, object=schema, id=test_user.id, schema_to_select=UserRead, return_as_model=True)
        assert updated_user.name == "Updated name"
        assert updated_user.username == "johndoe"
        assert updated_user.email == "johndoe@test.com"

    @pytest.mark.unit
    async def test_failed_user_update_of_existing_email(self, async_session: AsyncSession, test_user: User, other_user: User):
        schema = UserUpdate.model_validate(create_update_payload(email=other_user.email))
        with pytest.raises(DuplicateValueException):
            await crud_users.update(db=async_session, object=schema, id=test_user.id, schema_to_select=UserRead, return_as_model=True)

    @pytest.mark.unit
    async def test_failed_user_update_of_existing_username(self, async_session: AsyncSession, test_user: User, other_user: User):
        schema = UserUpdate.model_validate(create_update_payload(username=other_user.username))
        with pytest.raises(DuplicateValueException):
            await crud_users.update(db=async_session, object=schema, id=test_user.id, schema_to_select=UserRead, return_as_model=True)

    @pytest.mark.unit
    async def test_failed_user_update_of_non_existent_user(self, async_session: AsyncSession):
        schema = UserUpdate.model_validate(create_update_payload(username="non_existent"))
        with pytest.raises(NoResultFound):
            await crud_users.update(db=async_session, object=schema, schema_to_select=UserRead, return_as_model=True)

    @pytest.mark.unit
    async def test_updated_at_is_set_when_user_is_updated(self, async_session: AsyncSession, test_user: User):
        schema = UserUpdate.model_validate(create_update_payload(username="new_username"))
        updated_user = await crud_users.update(db=async_session, object=schema, id=test_user.id, schema_to_select=UserDetail, return_as_model=True)
        assert updated_user.updated_at is not None


# ─── Password change ──────────────────────────────────────────────────────────────────

class TestChangePassword:
    @pytest.mark.unit
    async def test_successful_password_change(self, async_session: AsyncSession, test_user: User):
        payload = UserPasswordUpdate.model_validate({"current_password": "testpassword123", "new_password": "Secure123#"})
        await crud_users.change_password(db=async_session, username=test_user.username, payload=payload)
        db_user = await authenticate_user(username_or_email=test_user.username, password="Secure123#", db=async_session)
        assert db_user is not False

    @pytest.mark.unit
    async def test_failed_password_change_of_non_existed_user(self, async_session: AsyncSession):
        payload = UserPasswordUpdate.model_validate({"current_password": "testpassword123", "new_password": "Secure123#"})
        with pytest.raises(NotFoundException):
            await crud_users.change_password(db=async_session, username="non_existed_user", payload=payload)

    @pytest.mark.unit
    async def test_failed_password_change_of_incorrect_current_password(self, async_session, test_user: User):
        payload = UserPasswordUpdate.model_validate({"current_password": "Incorrect12*", "new_password": "Secure123#"})
        with pytest.raises(ValueError):
            await crud_users.change_password(db=async_session, username=test_user.username, payload=payload)


# ─── Account deactivation ──────────────────────────────────────────────────────────────────

class TestDeactivate:
    @pytest.mark.unit
    async def test_successful_deactivation(self, async_session, test_user: User):
        await crud_users.deactivate(db=async_session, username=test_user.username)
        deactivated_user = await crud_users.get(db=async_session, username=test_user.username, schema_to_select=UserRead, return_as_model=True)
        assert deactivated_user.is_deleted is True
        assert deactivated_user.deleted_at is not None
        assert deactivated_user.updated_at is not None

    @pytest.mark.unit
    async def test_failed_deactivation_of_non_existed_user(self, async_session: AsyncSession):
        with pytest.raises(NotFoundException):
            await crud_users.deactivate(db=async_session, username="non_existed_user")


# ─── Hard delete ──────────────────────────────────────────────────────────────────

class TestHardDelete:
    @pytest.mark.unit
    async def test_successful_hard_delete(self, async_session: AsyncSession, test_user: User):
        await crud_users.hard_delete(db=async_session, username=test_user.username)
        deleted_user = await crud_users.get(db=async_session, username=test_user.username)
        assert deleted_user is None

    @pytest.mark.unit
    async def test_hard_delete_non_existed_user(self, async_session: AsyncSession):
        with pytest.raises(NotFoundException):
            await crud_users.hard_delete(db=async_session, username="non_existed_user")
