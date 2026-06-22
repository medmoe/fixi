import enum

from sqlalchemy import Enum as SAEnum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


class SkillLevel(enum.Enum):
    junior = "junior"
    mid = "mid"
    senior = "senior"


class WorkerTrade(Base):
    __tablename__ = "worker_trades"

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)
    worker_id: Mapped[int] = mapped_column(ForeignKey("worker_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    trade_id: Mapped[int] = mapped_column(ForeignKey("trade_categories.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_level: Mapped[SkillLevel] = mapped_column(SAEnum(SkillLevel), nullable=False, default=SkillLevel.junior)

    __table_args__ = (UniqueConstraint("worker_id", "trade_id", name="unique_worker_trade"),)  # prevents a worker from being registered to the same trade twice.
