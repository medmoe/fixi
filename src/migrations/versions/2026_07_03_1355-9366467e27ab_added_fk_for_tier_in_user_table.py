"""added FK for tier in user table

Revision ID: 9366467e27ab
Revises: 280edb0e0f9f
Create Date: 2026-07-03 13:55:37.944274+00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '9366467e27ab'
down_revision: Union[str, None] = '280edb0e0f9f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user', sa.Column('tier_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_users_tier_id_tiers',
        'user',
        'tiers',
        ['tier_id'],
        ['id']
    )
    op.create_index('ix_users_tier_id', 'user', ['tier_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_users_tier_id', table_name='user')
    op.drop_constraint('fk_users_tier_id_tiers', 'user', type_='foreignkey')
    op.drop_column('user', 'tier_id')
