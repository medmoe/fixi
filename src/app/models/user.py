import uuid as uuid_pkg
from enum import Enum
from datetime import UTC, datetime

from sqlalchemy import DateTime, Enum as SQLEnum
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from uuid6 import uuid7

from ..core.db.database import Base


class UserRole(str, Enum):
    CUSTOMER = "customer"
    HANDYMAN = "handyman"


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)

    name: Mapped[str] = mapped_column(String(30))
    username: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)

    profile_image_url: Mapped[str] = mapped_column(String, default="https://profileimageurl.com")
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), default_factory=uuid7, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default_factory=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    is_deleted: Mapped[bool] = mapped_column(default=False, index=True)
    is_superuser: Mapped[bool] = mapped_column(default=False)
    role_type: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole, name="user_role_type"),
        default=UserRole.CUSTOMER,
        server_default=UserRole.CUSTOMER.value,
        index=True,
    )
    token_version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")

    tier_id: Mapped[int | None] = mapped_column(ForeignKey("tier.id"), index=True, default=None, init=False)
