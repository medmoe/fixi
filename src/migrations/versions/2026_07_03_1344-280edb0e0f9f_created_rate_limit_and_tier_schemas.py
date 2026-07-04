"""created rate_limit and tier schemas

Revision ID: 280edb0e0f9f
Revises: dff282af1242
Create Date: 2026-07-03 13:44:32.864841+00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '280edb0e0f9f'
down_revision: Union[str, None] = 'dff282af1242'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'tiers',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        # TimestampMixin fields
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('current_timestamp(0)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('current_timestamp(0)'), nullable=True),
        # SoftDeleteMixin fields
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False),

        # Constraints & Keys
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('id'),
        sa.UniqueConstraint('name')
    )

    op.create_table(
        'rate_limits',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('tier_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('path', sa.String(), nullable=False),
        sa.Column('limit', sa.Integer(), nullable=False),
        sa.Column('period', sa.Integer(), nullable=False),
        # TimestampMixin fields
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('current_timestamp(0)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('current_timestamp(0)'), nullable=True),
        # SoftDeleteMixin fields
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default=sa.text('false'), nullable=False),

        # Constraints & Keys
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tier_id'], ['tiers.id'], ),
        sa.UniqueConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_rate_limits_tier_id'), 'rate_limits', ['tier_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_rate_limits_tier_id'), table_name='rate_limits')
    op.drop_table('rate_limits')
    op.drop_table('tiers')
