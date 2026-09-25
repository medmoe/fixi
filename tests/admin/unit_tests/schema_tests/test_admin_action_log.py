"""Schema tests for AdminActionLog -- does Pydantic validate the data
correctly? (field rules, defaults, ORM mode)."""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from src.app.schemas.admin_action_log import AdminActionLogCreateInternal, AdminActionLogRead


def valid_payload(**overrides) -> dict:
    defaults = {
        "action": "suspend_user",
        "target_type": "user",
        "target_id": 42,
    }
    return {**defaults, **overrides}


class TestAdminActionLogCreateInternal:
    def test_valid(self):
        schema = AdminActionLogCreateInternal(**valid_payload())
        assert schema.action == "suspend_user"
        assert schema.target_type == "user"
        assert schema.target_id == 42

    def test_actor_id_and_reason_default_to_none(self):
        schema = AdminActionLogCreateInternal(**valid_payload())
        assert schema.actor_id is None
        assert schema.reason is None

    def test_action_required(self):
        payload = valid_payload()
        del payload["action"]
        with pytest.raises(ValidationError):
            AdminActionLogCreateInternal(**payload)

    def test_target_type_required(self):
        payload = valid_payload()
        del payload["target_type"]
        with pytest.raises(ValidationError):
            AdminActionLogCreateInternal(**payload)

    def test_target_id_required(self):
        payload = valid_payload()
        del payload["target_id"]
        with pytest.raises(ValidationError):
            AdminActionLogCreateInternal(**payload)

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            AdminActionLogCreateInternal(**valid_payload(unexpected="value"))


class TestAdminActionLogRead:
    def read_payload(self, **overrides) -> dict:
        defaults = {
            **valid_payload(),
            "id": 1,
            "created_at": datetime.now(UTC),
        }
        return {**defaults, **overrides}

    def test_valid_from_dict(self):
        schema = AdminActionLogRead(**self.read_payload())
        assert schema.id == 1
        assert schema.action == "suspend_user"

    def test_id_required(self):
        payload = self.read_payload()
        del payload["id"]
        with pytest.raises(ValidationError):
            AdminActionLogRead(**payload)

    def test_from_orm_object(self):
        class FakeAdminActionLog:
            id = 1
            action = "reactivate_user"
            target_type = "user"
            target_id = 42
            actor_id = 7
            reason = None
            created_at = datetime.now(UTC)
            updated_at = None

        schema = AdminActionLogRead.model_validate(FakeAdminActionLog())
        assert schema.id == 1
        assert schema.action == "reactivate_user"
