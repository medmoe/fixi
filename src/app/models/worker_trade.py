import enum
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.database import Base

if TYPE_CHECKING:
    from .worker_profile import WorkerProfile
    from .trade_category import TradeCategory


class SkillLevel(enum.Enum):
    junior = "junior"
    mid = "mid"
    senior = "senior"


class WorkerTrade(Base):
    __tablename__ = "worker_trades"

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)
    worker_profile_id: Mapped[int] = mapped_column(ForeignKey("worker_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    trade_category_id: Mapped[int] = mapped_column(ForeignKey("trade_categories.id", ondelete="CASCADE"), nullable=False, index=True)
    worker_profile: Mapped["WorkerProfile"] = relationship("WorkerProfile", lazy="noload")
    trade_category: Mapped["TradeCategory"] = relationship("TradeCategory", lazy="noload")

    skill_level: Mapped[SkillLevel] = mapped_column(SAEnum(SkillLevel), nullable=False, default=SkillLevel.junior)
    __table_args__ = (UniqueConstraint("worker_profile_id", "trade_category_id", name="unique_worker_trade"),)  # prevents a worker from being registered to the same trade twice.
