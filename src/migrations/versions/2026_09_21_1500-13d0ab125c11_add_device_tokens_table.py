"""add device_tokens table

Revision ID: 13d0ab125c11
Revises: a794eb7c6594
Create Date: 2026-09-21 15:00:00+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '13d0ab125c11'
down_revision: Union[str, None] = 'a794eb7c6594'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_platform_enum = postgresql.ENUM(
    'web', 'ios', 'android',
    name='deviceplatform',
)


def upgrade() -> None:
    _platform_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'device_tokens',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(length=500), nullable=False),
        sa.Column('platform', postgresql.ENUM(name='deviceplatform', create_type=False), nullable=False),
        sa.Column('last_seen', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token'),
    )
    op.create_index(op.f('ix_device_tokens_user_id'), 'device_tokens', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_device_tokens_user_id'), table_name='device_tokens')
    op.drop_table('device_tokens')

    _platform_enum.drop(op.get_bind(), checkfirst=True)
