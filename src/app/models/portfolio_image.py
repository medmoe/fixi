from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base
from ..core.db.models import TimestampMixin


class PortfolioImage(Base, TimestampMixin):
    __tablename__ = "portfolio_images"
    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, unique=True, nullable=False, init=False)
    worker_profile_id: Mapped[int] = mapped_column(ForeignKey("worker_profiles.id", ondelete="CASCADE"), index=True)
    image_url: Mapped[str] = mapped_column(String(255), nullable=False)
