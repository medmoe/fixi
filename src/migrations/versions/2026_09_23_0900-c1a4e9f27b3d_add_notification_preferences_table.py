"""add notification_preferences table and skipped log status

Revision ID: c1a4e9f27b3d
Revises: 5467b57d9078
Create Date: 2026-09-23 09:00:00+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c1a4e9f27b3d'
down_revision: Union[str, None] = '5467b57d9078'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 'skipped' distinguishes "suppressed by a user's notification
    # preference" from an actual delivery failure in notification_logs.
    op.execute("ALTER TYPE notificationlogstatus ADD VALUE IF NOT EXISTS 'skipped'")

    op.create_table(
        'notification_preferences',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('channel', postgresql.ENUM(name='notificationchannel', create_type=False), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'channel', 'event_type', name='uq_notification_preferences_user_channel_event'),
    )
    op.create_index(op.f('ix_notification_preferences_user_id'), 'notification_preferences', ['user_id'], unique=False)
    op.create_index(op.f('ix_notification_preferences_channel'), 'notification_preferences', ['channel'], unique=False)
    op.create_index(op.f('ix_notification_preferences_event_type'), 'notification_preferences', ['event_type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notification_preferences_event_type'), table_name='notification_preferences')
    op.drop_index(op.f('ix_notification_preferences_channel'), table_name='notification_preferences')
    op.drop_index(op.f('ix_notification_preferences_user_id'), table_name='notification_preferences')
    op.drop_table('notification_preferences')

    # Postgres has no ALTER TYPE ... DROP VALUE -- rebuild the enum type
    # without 'skipped' instead. Safe as long as no row uses it, which is
    # guaranteed here since this migration also created its only writer.
    op.execute("ALTER TYPE notificationlogstatus RENAME TO notificationlogstatus_old")
    op.execute("CREATE TYPE notificationlogstatus AS ENUM ('sent', 'failed')")
    op.execute(
        "ALTER TABLE notification_logs "
        "ALTER COLUMN status TYPE notificationlogstatus "
        "USING status::text::notificationlogstatus"
    )
    op.execute("DROP TYPE notificationlogstatus_old")
