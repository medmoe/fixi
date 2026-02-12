from typing import Any

from sqlalchemy import JSON, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


class HandymanProfile(Base):
    __tablename__ = "handyman_profile"

    id: Mapped[int] = mapped_column(autoincrement=True, nullable=False, unique=True, primary_key=True, init=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"), index=True, unique=True)
    skill_category: Mapped[str] = mapped_column(String(120))
    hourly_rate: Mapped[float] = mapped_column(Float)
    skills: Mapped[list[str]] = mapped_column(JSON, default_factory=list)
    certification_urls: Mapped[list[str]] = mapped_column(JSON, default_factory=list)
    availability: Mapped[dict[str, Any]] = mapped_column(JSON, default_factory=dict)
