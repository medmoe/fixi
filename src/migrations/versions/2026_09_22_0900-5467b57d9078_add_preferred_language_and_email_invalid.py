"""add preferred_language and email_invalid to users

Revision ID: 5467b57d9078
Revises: 13d0ab125c11
Create Date: 2026-09-22 09:00:00+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5467b57d9078'
down_revision: Union[str, None] = '13d0ab125c11'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_preferred_language_enum = postgresql.ENUM(
    'ar', 'fr',
    name='preferredlanguage',
)


def upgrade() -> None:
    _preferred_language_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        'users',
        sa.Column(
            'preferred_language',
            postgresql.ENUM(name='preferredlanguage', create_type=False),
            nullable=False,
            server_default='fr',
        ),
    )
    op.alter_column('users', 'preferred_language', server_default=None)

    op.add_column('users', sa.Column('email_invalid', sa.Boolean(), nullable=False, server_default='false'))
    op.alter_column('users', 'email_invalid', server_default=None)


def downgrade() -> None:
    op.drop_column('users', 'email_invalid')
    op.drop_column('users', 'preferred_language')

    _preferred_language_enum.drop(op.get_bind(), checkfirst=True)
