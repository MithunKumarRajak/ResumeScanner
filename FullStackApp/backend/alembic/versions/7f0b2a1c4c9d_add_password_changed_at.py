"""Add password_changed_at to users

Revision ID: 7f0b2a1c4c9d
Revises: 46b39fab543a
Create Date: 2026-05-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "7f0b2a1c4c9d"
down_revision: Union[str, Sequence[str], None] = "46b39fab543a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "users",
        sa.Column(
            "password_changed_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )
    op.alter_column("users", "password_changed_at", server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("users", "password_changed_at")
