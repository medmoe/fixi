import pytest

from src.app.models import SkillLevel
from src.app.schemas.worker_trade import WorkerTradeCreate, WorkerTradeUpdate, WorkerTradeRead


class TestWorkerTradeSchemas:
    class TestWorkerTradeCreate:
        def test_valid(self):
            schema = WorkerTradeCreate(worker_profile_id=1, trade_category_id=2, skill_level=SkillLevel.mid)
            assert schema.worker_profile_id == 1
            assert schema.trade_category_id == 2
            assert schema.skill_level == SkillLevel.mid

        def test_default_skill_level_is_junior(self):
            schema = WorkerTradeCreate(worker_profile_id=1, trade_category_id=2)
            assert schema.skill_level == SkillLevel.junior

        def test_worker_id_must_be_positive(self):
            with pytest.raises(Exception):
                WorkerTradeCreate(worker_profile_id=0, trade_category_id=1)

        def test_trade_id_must_be_positive(self):
            with pytest.raises(Exception):
                WorkerTradeCreate(worker_profile_id=1, trade_category_id=0)

        def test_extra_fields_forbidden(self):
            with pytest.raises(Exception):
                WorkerTradeCreate(worker_profile_id=1, trade_category_id=2, unexpected="value")

        def test_all_skill_levels_accepted(self):
            for level in SkillLevel:
                schema = WorkerTradeCreate(worker_profile_id=1, trade_category_id=2, skill_level=level)
                assert schema.skill_level == level

    class TestWorkerTradeUpdate:
        def test_valid(self):
            schema = WorkerTradeUpdate(skill_level=SkillLevel.senior)
            assert schema.skill_level == SkillLevel.senior

        def test_extra_fields_forbidden(self):
            with pytest.raises(Exception):
                WorkerTradeUpdate(skill_level=SkillLevel.mid, unexpected="value")

        def test_invalid_skill_level(self):
            with pytest.raises(Exception):
                WorkerTradeUpdate(skill_level="expert")  # not a valid enum value

    class TestWorkerTradeRead:
        def test_skill_level_serialized_as_string(self):
            schema = WorkerTradeRead(
                id=1,
                worker_profile_id=1,
                trade_category_id=2,
                skill_level=SkillLevel.senior,
            )
            assert schema.skill_level == "senior"  # string, not enum ✅
            assert isinstance(schema.skill_level, str)

        def test_from_orm_object(self):
            class FakeORM:
                id = 1
                worker_profile_id = 1
                trade_id = 2
                skill_level = SkillLevel.mid
                worker = None
                trade = None

            schema = WorkerTradeRead.model_validate(FakeORM())
            assert schema.id == 1
            assert schema.skill_level == "mid"

        def test_nested_worker_and_trade_optional(self):
            schema = WorkerTradeRead(
                id=1,
                worker_profile_id=1,
                trade_category_id=2,
                skill_level=SkillLevel.junior,
            )
            assert schema.worker_profile is None
            assert schema.trade_category is None

        def test_extra_fields_forbidden(self):
            with pytest.raises(Exception):
                WorkerTradeRead(
                    id=1,
                    worker_profile_id=1,
                    trade_category_id=2,
                    skill_level=SkillLevel.junior,
                    unexpected="value",
                )
