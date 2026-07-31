from sqlalchemy import JSON, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id: Mapped[int] = mapped_column(autoincrement=True, nullable=False, unique=True, primary_key=True, init=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, unique=True)
    saved_addresses: Mapped[list[str]] = mapped_column(JSON, default_factory=list)
    loyalty_points: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
