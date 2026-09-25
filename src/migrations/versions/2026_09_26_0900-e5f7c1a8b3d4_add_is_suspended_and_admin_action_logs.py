"""add is_suspended to users and admin_action_logs table

Revision ID: e5f7c1a8b3d4
Revises: 4c1e8a3f9d02
Create Date: 2026-09-26 09:00:00+00:00

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e5f7c1a8b3d4'
down_revision: Union[str, None] = '4c1e8a3f9d02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_suspended', sa.Boolean(), nullable=False, server_default='false'))
    op.alter_column('users', 'is_suspended', server_default=None)
    op.create_index(op.f('ix_users_is_suspended'), 'users', ['is_suspended'], unique=False)

    op.create_table(
        'admin_action_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('target_type', sa.String(length=64), nullable=False),
        sa.Column('target_id', sa.Integer(), nullable=False),
        sa.Column('actor_id', sa.Integer(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP(0)'), nullable=True),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_admin_action_logs_action'), 'admin_action_logs', ['action'], unique=False)
    op.create_index(op.f('ix_admin_action_logs_target_type'), 'admin_action_logs', ['target_type'], unique=False)
    op.create_index(op.f('ix_admin_action_logs_target_id'), 'admin_action_logs', ['target_id'], unique=False)
    op.create_index(op.f('ix_admin_action_logs_actor_id'), 'admin_action_logs', ['actor_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_admin_action_logs_actor_id'), table_name='admin_action_logs')
    op.drop_index(op.f('ix_admin_action_logs_target_id'), table_name='admin_action_logs')
    op.drop_index(op.f('ix_admin_action_logs_target_type'), table_name='admin_action_logs')
    op.drop_index(op.f('ix_admin_action_logs_action'), table_name='admin_action_logs')
    op.drop_table('admin_action_logs')

    op.drop_index(op.f('ix_users_is_suspended'), table_name='users')
    op.drop_column('users', 'is_suspended')
