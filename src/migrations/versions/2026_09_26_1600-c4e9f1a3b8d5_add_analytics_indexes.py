"""add indexes on jobs.created_at, job_applications.created_at, job_applications.status

Revision ID: c4e9f1a3b8d5
Revises: b3d8e5f2a7c9
Create Date: 2026-09-26 16:00:00+00:00

"""
from collections.abc import Sequence
from typing import Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c4e9f1a3b8d5'
down_revision: Union[str, None] = 'b3d8e5f2a7c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(op.f('ix_jobs_created_at'), 'jobs', ['created_at'], unique=False)
    op.create_index(op.f('ix_job_applications_created_at'), 'job_applications', ['created_at'], unique=False)
    op.create_index(op.f('ix_job_applications_status'), 'job_applications', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_job_applications_status'), table_name='job_applications')
    op.drop_index(op.f('ix_job_applications_created_at'), table_name='job_applications')
    op.drop_index(op.f('ix_jobs_created_at'), table_name='jobs')
