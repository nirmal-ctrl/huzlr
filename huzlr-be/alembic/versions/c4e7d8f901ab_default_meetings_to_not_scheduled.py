"""default imported meetings to not scheduled

Revision ID: c4e7d8f901ab
Revises: 9b2c3d4e5f6a
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4e7d8f901ab"
down_revision: Union[str, Sequence[str], None] = "9b2c3d4e5f6a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "scrum_meetings",
        "status",
        existing_type=sa.String(length=40),
        server_default="not_scheduled",
        existing_nullable=False,
    )
    op.execute(
        """
        UPDATE scrum_meetings
        SET status = 'not_scheduled'
        WHERE status = 'scheduled' AND bot_enabled IS FALSE
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE scrum_meetings
        SET status = 'scheduled'
        WHERE status = 'not_scheduled'
        """
    )
    op.alter_column(
        "scrum_meetings",
        "status",
        existing_type=sa.String(length=40),
        server_default="scheduled",
        existing_nullable=False,
    )
