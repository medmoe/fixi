import pytest
from datetime import datetime, UTC
from pydantic import ValidationError
from src.app.schemas.trade_category import (
    TradeCategoryBase,
    TradeCategoryCreate,
    TradeCategoryUpdate,
    TradeCategoryUpdateInternal,
    TradeCategoryRead,
    TradeCategoryDelete,
)


# ─── Shared valid payload ────────────────────────────────────────────────────

def valid_payload(**overrides) -> dict:
    defaults = {
        "name": "plumbing",
        "display_name": "Plumbing",
        "icon_name": "plumbing-icon",
        "parent_id": None,
    }
    return {**defaults, **overrides}


# ─── TradeCategoryBase ───────────────────────────────────────────────────────

class TestTradeCategoryBase:
    def test_valid(self):
        schema = TradeCategoryBase(**valid_payload())
        assert schema.name == "plumbing"
        assert schema.display_name == "Plumbing"
        assert schema.icon_name == "plumbing-icon"
        assert schema.parent_id is None

    def test_icon_name_defaults_to_none(self):
        schema = TradeCategoryBase(**valid_payload(icon_name=None))
        assert schema.icon_name is None

    def test_display_name_ar_and_fr_default_to_none(self):
        schema = TradeCategoryBase(**valid_payload())
        assert schema.display_name_ar is None
        assert schema.display_name_fr is None

    def test_display_name_ar_and_fr_accept_values(self):
        schema = TradeCategoryBase(**valid_payload(display_name_ar="سبّاك", display_name_fr="Plombier"))
        assert schema.display_name_ar == "سبّاك"
        assert schema.display_name_fr == "Plombier"

    def test_display_name_ar_max_length(self):
        with pytest.raises(ValidationError):
            TradeCategoryBase(**valid_payload(display_name_ar="a" * 51))

    def test_display_name_fr_max_length(self):
        with pytest.raises(ValidationError):
            TradeCategoryBase(**valid_payload(display_name_fr="a" * 51))

    def test_parent_id_defaults_to_none(self):
        schema = TradeCategoryBase(**valid_payload(parent_id=None))
        assert schema.parent_id is None

    def test_parent_id_accepts_valid_int(self):
        schema = TradeCategoryBase(**valid_payload(parent_id=5))
        assert schema.parent_id == 5

    def test_name_max_length(self):
        with pytest.raises(ValidationError):
            TradeCategoryBase(**valid_payload(name="a" * 51))  # 51 chars ❌

    def test_display_name_max_length(self):
        with pytest.raises(ValidationError):
            TradeCategoryBase(**valid_payload(display_name="a" * 51))

    def test_icon_name_max_length(self):
        with pytest.raises(ValidationError):
            TradeCategoryBase(**valid_payload(icon_name="a" * 51))

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            TradeCategoryBase(**valid_payload(unexpected_field="value"))

    def test_name_required(self):
        payload = valid_payload()
        del payload["name"]
        with pytest.raises(ValidationError):
            TradeCategoryBase(**payload)

    def test_display_name_required(self):
        payload = valid_payload()
        del payload["display_name"]
        with pytest.raises(ValidationError):
            TradeCategoryBase(**payload)


# ─── TradeCategoryCreate ─────────────────────────────────────────────────────

class TestTradeCategoryCreate:
    def test_valid(self):
        schema = TradeCategoryCreate(**valid_payload())
        assert schema.name == "plumbing"

    def test_inherits_base_validation(self):
        """name max_length constraint inherited from base."""
        with pytest.raises(ValidationError):
            TradeCategoryCreate(**valid_payload(name="a" * 51))

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            TradeCategoryCreate(**valid_payload(unexpected="value"))

    def test_without_optional_fields(self):
        """icon_name and parent_id are optional."""
        schema = TradeCategoryCreate(name="plumbing", display_name="Plumbing")
        assert schema.icon_name is None
        assert schema.parent_id is None


# ─── TradeCategoryUpdate ─────────────────────────────────────────────────────

class TestTradeCategoryUpdate:
    def test_all_fields_optional(self):
        """Update schema should accept empty payload."""
        schema = TradeCategoryUpdate()
        assert schema.name is None
        assert schema.display_name is None
        assert schema.display_name_ar is None
        assert schema.display_name_fr is None
        assert schema.icon_name is None
        assert schema.parent_id is None

    def test_partial_update_display_name_ar_only(self):
        schema = TradeCategoryUpdate(display_name_ar="كهربائي")
        assert schema.display_name_ar == "كهربائي"
        assert schema.display_name_fr is None

    def test_partial_update_name_only(self):
        schema = TradeCategoryUpdate(name="electrical")
        assert schema.name == "electrical"
        assert schema.display_name is None

    def test_partial_update_display_name_only(self):
        schema = TradeCategoryUpdate(display_name="Electrical Work")
        assert schema.display_name == "Electrical Work"

    def test_full_update(self):
        schema = TradeCategoryUpdate(**valid_payload())
        assert schema.name == "plumbing"
        assert schema.display_name == "Plumbing"

    def test_name_max_length(self):
        with pytest.raises(ValidationError):
            TradeCategoryUpdate(name="a" * 51)

    def test_display_name_max_length(self):
        with pytest.raises(ValidationError):
            TradeCategoryUpdate(display_name="a" * 51)

    def test_icon_name_max_length(self):
        with pytest.raises(ValidationError):
            TradeCategoryUpdate(icon_name="a" * 51)

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            TradeCategoryUpdate(unexpected="value")


# ─── TradeCategoryInternal ───────────────────────────────────────────────────

class TestTradeCategoryInternal:
    def internal_payload(self, **overrides) -> dict:
        defaults = {
            **valid_payload(),
            "id": 1,
            "created_at": datetime.now(UTC),
            "updated_at": None,
        }
        return {**defaults, **overrides}

    def test_valid(self):
        schema = TradeCategoryUpdateInternal(**self.internal_payload())
        assert schema.id == 1
        assert schema.created_at is not None
        assert schema.updated_at is None

    def test_id_required(self):
        payload = self.internal_payload()
        del payload["id"]
        with pytest.raises(ValidationError):
            TradeCategoryUpdateInternal(**payload)

    def test_created_at_required(self):
        payload = self.internal_payload()
        del payload["created_at"]
        with pytest.raises(ValidationError):
            TradeCategoryUpdateInternal(**payload)

    def test_updated_at_optional(self):
        schema = TradeCategoryUpdateInternal(**self.internal_payload(updated_at=None))
        assert schema.updated_at is None

    def test_updated_at_accepts_datetime(self):
        now = datetime.now(UTC)
        schema = TradeCategoryUpdateInternal(**self.internal_payload(updated_at=now))
        assert schema.updated_at == now

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            TradeCategoryUpdateInternal(**self.internal_payload(unexpected="value"))


# ─── TradeCategoryRead ───────────────────────────────────────────────────────

class TestTradeCategoryRead:
    def read_payload(self, **overrides) -> dict:
        defaults = {
            **valid_payload(),
            "id": 1,
            "created_at": datetime.now(UTC),
        }
        return {**defaults, **overrides}

    def test_valid_from_dict(self):
        schema = TradeCategoryRead(**self.read_payload())
        assert schema.id == 1
        assert schema.name == "plumbing"

    def test_from_orm_object(self):
        """from_attributes=True allows reading from ORM model instances."""
        class FakeORM:
            id = 1
            name = "plumbing"
            display_name = "Plumbing"
            icon_name = "plumbing-icon"
            parent_id = None
            created_at = datetime.now(UTC)

        schema = TradeCategoryRead.model_validate(FakeORM())
        assert schema.id == 1
        assert schema.name == "plumbing"

    def test_id_required(self):
        payload = self.read_payload()
        del payload["id"]
        with pytest.raises(ValidationError):
            TradeCategoryRead(**payload)

    def test_created_at_optional(self):
        schema = TradeCategoryRead(**self.read_payload(created_at=None))
        assert schema.created_at is None

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            TradeCategoryRead(**self.read_payload(unexpected="value"))


# ─── TradeCategoryDelete ─────────────────────────────────────────────────────

class TestTradeCategoryDelete:
    def test_defaults(self):
        schema = TradeCategoryDelete()
        assert schema.is_deleted is True
        assert schema.deleted_at is None

    def test_deleted_at_accepts_datetime(self):
        now = datetime.now(UTC)
        schema = TradeCategoryDelete(deleted_at=now)
        assert schema.deleted_at == now

    def test_is_deleted_can_be_false(self):
        schema = TradeCategoryDelete(is_deleted=False)
        assert schema.is_deleted is False

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            TradeCategoryDelete(unexpected="value")