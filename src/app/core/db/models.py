import uuid as uuid_pkg
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column
from uuid6 import uuid7


class UUIDMixin(MappedAsDataclass):
    uuid: Mapped[uuid_pkg.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default_factory=uuid7, init=False, server_default=text("gen_random_uuid()")
    )


class TimestampMixin(MappedAsDataclass):
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default_factory=lambda: datetime.now(UTC),
        server_default=text("CURRENT_TIMESTAMP(0)"),
        kw_only=True,
        init=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        onupdate=lambda: datetime.now(UTC),
        server_default=text("CURRENT_TIMESTAMP(0)"),
        kw_only=True,
        init=False
    )


class SoftDeleteMixin(MappedAsDataclass):
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None, kw_only=True, init=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, kw_only=True, init=False)
