from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


class ServiceCategory(Base):
    __tablename__ = "service_category"

    id: Mapped[int] = mapped_column("id", autoincrement=True, nullable=False, unique=True, primary_key=True, init=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(500), default=None)
