from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db.database import Base

if TYPE_CHECKING:
    from .job import Job


class TradeCategory(Base):
    __tablename__ = "trade_categories"

    id: Mapped[int] = mapped_column(
        autoincrement=True, nullable=False, unique=True, primary_key=True, init=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)  # slug e.g. "electrical"
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)  # human label e.g. "Electrical"
    icon_name: Mapped[str | None] = mapped_column(String(120), nullable=True, default=None)  # e.g. "bolt", "wrench"
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("trade_categories.id"), nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), init=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), init=False)

    jobs: Mapped[list["Job"]] = relationship("Job", lazy="selectin", default_factory=list, init=False)
