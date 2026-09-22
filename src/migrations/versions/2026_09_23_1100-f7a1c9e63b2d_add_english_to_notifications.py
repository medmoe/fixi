"""add title_en/body_en to notifications

Revision ID: f7a1c9e63b2d
Revises: d2b5f0a38c4e
Create Date: 2026-09-23 11:00:00+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f7a1c9e63b2d'
down_revision: Union[str, None] = 'd2b5f0a38c4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('notifications', sa.Column('title_en', sa.String(length=255), nullable=True))
    op.add_column('notifications', sa.Column('body_en', sa.Text(), nullable=True))

    # Backfill existing rows from French rather than an empty placeholder --
    # every pre-existing notification already has real French copy, so
    # that's the closer-to-correct value until re-sent, not blank text.
    op.execute("UPDATE notifications SET title_en = title_fr, body_en = body_fr")

    op.alter_column('notifications', 'title_en', nullable=False)
    op.alter_column('notifications', 'body_en', nullable=False)


def downgrade() -> None:
    op.drop_column('notifications', 'body_en')
    op.drop_column('notifications', 'title_en')
