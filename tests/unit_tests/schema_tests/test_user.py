# tests/unit_tests/schema_tests/test_user_schemas.py

from datetime import datetime, UTC
from uuid import uuid4

import pytest
from pydantic import ValidationError

from src.app.models import UserRole
from src.app.schemas.user import (
    UserBase,
    UserRead,
    UserDetail,
    UserCreate,
    UserCreateInternal,
    UserUpdate,
    UserUpdateInternal,
    UserPasswordUpdate,
    UserTierUpdate,
    UserAdminUpdate,
)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

def valid_base_payload(**overrides) -> dict:
    return {
        "name": "John Doe",
        "username": "john_doe",
        "email": "john@example.com",
        "location": None,
        **overrides,
    }


def valid_read_payload(**overrides) -> dict:
    return {
        **valid_base_payload(),
        "id": 1,
        "uuid": uuid4(),
        "profile_image_url": "https://example.com/avatar.jpg",
        "role_type": UserRole.CUSTOMER,
        **overrides,
    }


def valid_create_payload(**overrides) -> dict:
    return {
        **valid_base_payload(),
        "password": "StrongP@ss1",
        **overrides,
    }


# ─── UserBase ─────────────────────────────────────────────────────────────────

class TestUserBase:
    def test_valid(self):
        schema = UserBase(**valid_base_payload())
        assert schema.name == "John Doe"
        assert schema.username == "john_doe"
        assert schema.email == "john@example.com"
        assert schema.location is None

    def test_name_min_length(self):
        with pytest.raises(ValidationError):
            UserBase(**valid_base_payload(name="J"))

    def test_name_max_length(self):
        with pytest.raises(ValidationError):
            UserBase(**valid_base_payload(name="J" * 31))

    def test_username_min_length(self):
        with pytest.raises(ValidationError):
            UserBase(**valid_base_payload(username="j"))

    def test_username_max_length(self):
        with pytest.raises(ValidationError):
            UserBase(**valid_base_payload(username="j" * 21))

    def test_username_must_start_with_letter(self):
        with pytest.raises(ValidationError):
            UserBase(**valid_base_payload(username="1johndoe"))

    def test_username_rejects_uppercase(self):
        with pytest.raises(ValidationError):
            UserBase(**valid_base_payload(username="JohnDoe"))

    def test_username_rejects_special_chars(self):
        with pytest.raises(ValidationError):
            UserBase(**valid_base_payload(username="john-doe"))

    def test_username_accepts_underscore(self):
        schema = UserBase(**valid_base_payload(username="john_doe"))
        assert schema.username == "john_doe"

    def test_username_accepts_numbers(self):
        schema = UserBase(**valid_base_payload(username="john123"))
        assert schema.username == "john123"

    def test_invalid_email(self):
        with pytest.raises(ValidationError):
            UserBase(**valid_base_payload(email="not-an-email"))

    def test_location_defaults_to_none(self):
        schema = UserBase(**valid_base_payload())
        assert schema.location is None

    def test_location_accepts_wkt_point(self):
        schema = UserBase(**valid_base_payload(location="POINT(-73.9857 40.7484)"))
        assert schema.location == "POINT(-73.9857 40.7484)"

    def test_from_attributes_true(self):
        class FakeORM:
            name = "John Doe"
            username = "john_doe"
            email = "john@example.com"
            location = None

        schema = UserBase.model_validate(FakeORM())
        assert schema.name == "John Doe"


# ─── UserRead ─────────────────────────────────────────────────────────────────

class TestUserRead:
    def test_valid(self):
        schema = UserRead(**valid_read_payload())
        data = schema.model_dump()
        assert data["id"] == 1
        assert data["role_type"] == "customer"

    def test_role_type_serializes_to_value(self):
        """role_type should serialize as string value not enum object."""
        schema = UserRead(**valid_read_payload(role_type=UserRole.WORKER))
        data = schema.model_dump()
        assert data["role_type"] == "worker"  # ✅ not UserRole.WORKER

    def test_role_type_worker(self):
        schema = UserRead(**valid_read_payload(role_type=UserRole.WORKER))
        data = schema.model_dump()
        assert data["role_type"] == "worker"

    def test_from_orm_object(self):
        class FakeORM:
            id = 1
            name = "John Doe"
            username = "john_doe"
            email = "john@example.com"
            location = None
            uuid = uuid4()
            profile_image_url = "https://example.com/avatar.jpg"
            role_type = UserRole.CUSTOMER

        schema = UserRead.model_validate(FakeORM())
        data = schema.model_dump()
        assert data["id"] == 1
        assert data["role_type"] == "customer"

    def test_profile_image_url_valid(self):
        schema = UserRead(**valid_read_payload(
            profile_image_url="https://cdn.example.com/avatar.jpg"
        ))
        assert schema.profile_image_url is not None

    def test_invalid_profile_image_url(self):
        with pytest.raises(ValidationError):
            UserRead(**valid_read_payload(profile_image_url="not-a-url"))

    def test_uuid_field_present(self):
        uid = uuid4()
        schema = UserRead(**valid_read_payload(uuid=uid))
        assert schema.uuid == uid


# ─── UserCreate ───────────────────────────────────────────────────────────────

class TestUserCreate:
    def test_valid(self):
        schema = UserCreate(**valid_create_payload())
        assert schema.name == "John Doe"
        assert schema.password == "StrongP@ss1"

    def test_password_min_length(self):
        with pytest.raises(ValidationError):
            UserCreate(**valid_create_payload(password="short"))

    def test_password_max_length(self):
        with pytest.raises(ValidationError):
            UserCreate(**valid_create_payload(password="p" * 129))

    def test_password_at_min_length(self):
        schema = UserCreate(**valid_create_payload(password="Secure1&"))
        assert schema.password == "Secure1&"

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            UserCreate(**valid_create_payload(unexpected="value"))

    def test_invalid_email_rejected(self):
        with pytest.raises(ValidationError):
            UserCreate(**valid_create_payload(email="not-an-email"))

    def test_requires_name(self):
        payload = valid_create_payload()
        del payload["name"]
        with pytest.raises(ValidationError):
            UserCreate(**payload)

    def test_requires_username(self):
        payload = valid_create_payload()
        del payload["username"]
        with pytest.raises(ValidationError):
            UserCreate(**payload)

    def test_requires_email(self):
        payload = valid_create_payload()
        del payload["email"]
        with pytest.raises(ValidationError):
            UserCreate(**payload)

    def test_requires_password(self):
        payload = valid_create_payload()
        del payload["password"]
        with pytest.raises(ValidationError):
            UserCreate(**payload)


# ─── UserCreateInternal ───────────────────────────────────────────────────────

class TestUserCreateInternal:
    def test_valid(self):
        schema = UserCreateInternal(
            **valid_base_payload(),
            hashed_password="$2b$12$hashedpassword",
        )
        assert schema.hashed_password == "$2b$12$hashedpassword"
        assert schema.role_type == UserRole.CUSTOMER
        assert schema.is_superuser is False
        assert schema.token_version == 1
        assert schema.tier_id is None

    def test_default_role_is_customer(self):
        schema = UserCreateInternal(
            **valid_base_payload(),
            hashed_password="$2b$12$hashedpassword",
        )
        assert schema.role_type == UserRole.CUSTOMER

    def test_worker_role(self):
        schema = UserCreateInternal(
            **valid_base_payload(),
            hashed_password="$2b$12$hashedpassword",
            role_type=UserRole.WORKER,
        )
        data = schema.model_dump()
        assert data["role_type"] == "worker"

    def test_tier_id_optional(self):
        schema = UserCreateInternal(
            **valid_base_payload(),
            hashed_password="hashed",
            tier_id=5,
        )
        assert schema.tier_id == 5

    def test_superuser_flag(self):
        schema = UserCreateInternal(
            **valid_base_payload(),
            hashed_password="hashed",
            is_superuser=True,
        )
        assert schema.is_superuser is True


# ─── UserUpdate ───────────────────────────────────────────────────────────────

class TestUserUpdate:
    def test_all_fields_optional(self):
        schema = UserUpdate()
        assert schema.name is None
        assert schema.username is None
        assert schema.email is None
        assert schema.profile_image_url is None
        assert schema.location is None

    def test_partial_update_name(self):
        schema = UserUpdate(name="Jane Doe")
        assert schema.name == "Jane Doe"
        assert schema.username is None

    def test_partial_update_email(self):
        schema = UserUpdate(email="new@example.com")
        assert schema.email == "new@example.com"

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            UserUpdate(unexpected="value")

    def test_invalid_email(self):
        with pytest.raises(ValidationError):
            UserUpdate(email="not-an-email")

    def test_name_max_length(self):
        with pytest.raises(ValidationError):
            UserUpdate(name="J" * 31)

    def test_username_pattern_enforced(self):
        with pytest.raises(ValidationError):
            UserUpdate(username="Invalid-Username")

    def test_invalid_profile_image_url(self):
        with pytest.raises(ValidationError):
            UserUpdate(profile_image_url="not-a-url")


# ─── UserUpdateInternal ───────────────────────────────────────────────────────

class TestUserUpdateInternal:
    def test_valid(self):
        now = datetime.now(UTC)
        schema = UserUpdateInternal(updated_at=now)
        assert schema.updated_at == now

    def test_requires_updated_at(self):
        with pytest.raises(ValidationError):
            UserUpdateInternal()

    def test_inherits_update_fields(self):
        now = datetime.now(UTC)
        schema = UserUpdateInternal(name="Jane Doe", updated_at=now)
        assert schema.name == "Jane Doe"
        assert schema.updated_at == now


# ─── UserPasswordUpdate ───────────────────────────────────────────────────────

class TestUserPasswordUpdate:
    def test_valid(self):
        schema = UserPasswordUpdate(
            current_password="OldPass123",
            new_password="NewPass456#",
        )
        assert schema.current_password == "OldPass123"
        assert schema.new_password == "NewPass456#"

    def test_new_password_min_length(self):
        with pytest.raises(ValidationError):
            UserPasswordUpdate(current_password="old", new_password="short")

    def test_new_password_max_length(self):
        with pytest.raises(ValidationError):
            UserPasswordUpdate(current_password="old", new_password="p" * 129)

    def test_requires_current_password(self):
        with pytest.raises(ValidationError):
            UserPasswordUpdate(new_password="NewPass456")

    def test_requires_new_password(self):
        with pytest.raises(ValidationError):
            UserPasswordUpdate(current_password="OldPass123")

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            UserPasswordUpdate(
                current_password="old",
                new_password="NewPass456",
                unexpected="value",
            )


# ─── UserTierUpdate ───────────────────────────────────────────────────────────

class TestUserTierUpdate:
    def test_valid(self):
        schema = UserTierUpdate(tier_id=1)
        assert schema.tier_id == 1

    def test_tier_id_must_be_positive(self):
        with pytest.raises(ValidationError):
            UserTierUpdate(tier_id=0)

    def test_tier_id_must_be_positive_no_negative(self):
        with pytest.raises(ValidationError):
            UserTierUpdate(tier_id=-1)

    def test_requires_tier_id(self):
        with pytest.raises(ValidationError):
            UserTierUpdate()

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            UserTierUpdate(tier_id=1, unexpected="value")


# ─── UserAdminUpdate ──────────────────────────────────────────────────────────

class TestUserAdminUpdate:
    def test_all_fields_optional(self):
        schema = UserAdminUpdate()
        assert schema.role_type is None
        assert schema.is_superuser is None
        assert schema.tier_id is None

    def test_set_role_type_worker(self):
        schema = UserAdminUpdate(role_type=UserRole.WORKER)
        assert schema.role_type == UserRole.WORKER

    def test_set_role_type_customer(self):
        schema = UserAdminUpdate(role_type=UserRole.CUSTOMER)
        assert schema.role_type == UserRole.CUSTOMER

    def test_set_superuser(self):
        schema = UserAdminUpdate(is_superuser=True)
        assert schema.is_superuser is True

    def test_set_tier_id(self):
        schema = UserAdminUpdate(tier_id=3)
        assert schema.tier_id == 3

    def test_tier_id_must_be_positive(self):
        with pytest.raises(ValidationError):
            UserAdminUpdate(tier_id=0)

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            UserAdminUpdate(unexpected="value")

    def test_partial_admin_update(self):
        schema = UserAdminUpdate(role_type=UserRole.WORKER, is_superuser=False)
        assert schema.role_type == UserRole.WORKER
        assert schema.is_superuser is False
        assert schema.tier_id is None

# ─── UserDetail ───────────────────────────────────────────────────────────────

class TestUserDetail:
    def test_valid(self):
        now = datetime.now(UTC)
        schema = UserDetail(**valid_read_payload(
            created_at=now,
            updated_at=now,
        ))
        assert schema.id == 1
        assert schema.created_at == now

    def test_inherits_user_read_fields(self):
        now = datetime.now(UTC)
        schema = UserDetail(**valid_read_payload(
            created_at=now,
            updated_at=now,
        ))
        data = schema.model_dump()
        assert data['role_type'] == 'customer'
        assert data['email'] == 'john@example.com'
