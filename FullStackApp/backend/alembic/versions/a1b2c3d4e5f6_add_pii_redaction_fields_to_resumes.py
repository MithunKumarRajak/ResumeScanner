"""Add pii_redaction_count and pii_types_found to resumes

Revision ID: a1b2c3d4e5f6
Revises: 7f0b2a1c4c9d
Create Date: 2026-07-02 03:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "7f0b2a1c4c9d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add pii_redaction_count and pii_types_found to resumes table."""
    op.add_column(
        "resumes",
        sa.Column("pii_redaction_count", sa.Integer(), nullable=True),
    )
    op.add_column(
        "resumes",
        sa.Column("pii_types_found", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """Remove pii columns from resumes table."""
    op.drop_column("resumes", "pii_types_found")
    op.drop_column("resumes", "pii_redaction_count")
