"""add notification_logs table

Revision ID: 045a8d5c0298
Revises: 8a1f3c6e9d24
Create Date: 2026-09-20 14:45:00+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '045a8d5c0298'
down_revision: Union[str, None] = '8a1f3c6e9d24'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_channel_enum = postgresql.ENUM(
    'in_app', 'push', 'email', 'sms',
    name='notificationchannel',
)
_status_enum = postgresql.ENUM(
    'sent', 'failed',
    name='notificationlogstatus',
)


def upgrade() -> None:
    _channel_enum.create(op.get_bind(), checkfirst=True)
    _status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'notification_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('channel', postgresql.ENUM(name='notificationchannel', create_type=False), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('status', postgresql.ENUM(name='notificationlogstatus', create_type=False), nullable=False),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_notification_logs_event_type'), 'notification_logs', ['event_type'], unique=False)
    op.create_index(op.f('ix_notification_logs_channel'), 'notification_logs', ['channel'], unique=False)
    op.create_index(op.f('ix_notification_logs_status'), 'notification_logs', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notification_logs_status'), table_name='notification_logs')
    op.drop_index(op.f('ix_notification_logs_channel'), table_name='notification_logs')
    op.drop_index(op.f('ix_notification_logs_event_type'), table_name='notification_logs')
    op.drop_table('notification_logs')

    _status_enum.drop(op.get_bind(), checkfirst=True)
    _channel_enum.drop(op.get_bind(), checkfirst=True)
