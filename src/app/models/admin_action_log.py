from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..core.db.database import Base
from ..core.db.models import TimestampMixin


class AdminActionLog(Base, TimestampMixin):
    """Append-only audit trail of admin actions -- Phase 8 Issue 4's
    (Admin panel: user management) "who did what to whom, when"
    requirement. target_type/target_id are a loose pointer rather than one
    FK per possible target, since later admin panels (CNI verification
    queue, review moderation) are expected to log against different
    tables here too, not just users."""

    __tablename__ = "admin_action_logs"

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)

    action: Mapped[str] = mapped_column(String(64), index=True)
    target_type: Mapped[str] = mapped_column(String(64), index=True)
    target_id: Mapped[int] = mapped_column(index=True)

    # Null means the acting admin's own account was later removed -- the
    # log entry itself is kept regardless (see Payment.recorded_by for the
    # same SET NULL precedent).
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, default=None, index=True)
    reason: Mapped[str | None] = mapped_column(Text(), nullable=True, default=None)
