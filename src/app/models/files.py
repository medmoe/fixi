from datetime import UTC, datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base


class File(Base):
    __tablename__ = "files"

    id: Mapped[int] = mapped_column("id", autoincrement=True, primary_key=True, index=True, init=False, unique=True)
    belongs_to_user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True)
    file_key: Mapped[str] = mapped_column("file_key", String(255), unique=True, index=True, nullable=False)
    original_file_name: Mapped[str] = mapped_column("original_file_name", String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column("mime_type", String(255), nullable=False)
    file_size: Mapped[int] = mapped_column("file_size", BigInteger, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=lambda: datetime.now(UTC))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    is_deleted: Mapped[bool] = mapped_column("is_deleted", Boolean, default=False)
    is_processed: Mapped[bool] = mapped_column("is_processed", Boolean, default=False)
    is_safe: Mapped[bool] = mapped_column("is_safe", Boolean, default=False)
    exif_stripped: Mapped[bool] = mapped_column("exif_stripped", Boolean, default=False)
