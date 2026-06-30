# src/app/schemas/worker_trade.py
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from ..models.worker_trade import SkillLevel
from .trade_category import TradeCategoryRead
from .worker_profile import WorkerProfileRead


class WorkerTradeBase(BaseModel):
    model_config = ConfigDict(extra="forbid")
    skill_level: Annotated[SkillLevel, Field(default=SkillLevel.junior)]


class WorkerTradeCreate(WorkerTradeBase):
    """Used to assign a trade to a worker."""
    worker_id: Annotated[int, Field(gt=0)]
    trade_id: Annotated[int, Field(gt=0)]


class WorkerTradeUpdate(BaseModel):
    """Only skill_level can be updated."""
    model_config = ConfigDict(extra="forbid")
    skill_level: Annotated[SkillLevel, Field()]


class WorkerTradeUpdateInternal(WorkerTradeBase):
    pass


class WorkerTradeDelete(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Annotated[int, Field(gt=0)]


class WorkerTradeRead(BaseModel):
    """Returned to clients — nests worker and trade details."""
    model_config = ConfigDict(
        extra="forbid",
        from_attributes=True,
        use_enum_values=True,   # ✅ serializes SkillLevel to its value string
    )
    id: int
    worker_id: int
    trade_id: int
    skill_level: str            # ✅ string after use_enum_values
    worker: WorkerProfileRead | None = None
    trade: TradeCategoryRead | None = None
