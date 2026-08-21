"""track meeting join history

Revision ID: d5e6f7a8b9c0
Revises: c4e7d8f901ab
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, Sequence[str], None] = "c4e7d8f901ab"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "scrum_meetings",
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_scrum_meetings_joined_at", "scrum_meetings", ["joined_at"])

    # Preserve history already captured before joined_at existed. A transcript is
    # definitive evidence that the bridge joined; completed is definitive under
    # the existing worker state machine.
    op.execute(
        """
        UPDATE scrum_meetings AS meeting
        SET joined_at = COALESCE(
            (
                SELECT MIN(segment.created_at)
                FROM meeting_transcript_segments AS segment
                WHERE segment.meeting_id = meeting.id
            ),
            meeting.claimed_at,
            meeting.heartbeat_at,
            meeting.completed_at,
            meeting.starts_at
        )
        WHERE meeting.status IN ('joined', 'leaving', 'completed')
           OR EXISTS (
                SELECT 1
                FROM meeting_transcript_segments AS segment
                WHERE segment.meeting_id = meeting.id
           )
        """
    )


def downgrade() -> None:
    op.drop_index("ix_scrum_meetings_joined_at", table_name="scrum_meetings")
    op.drop_column("scrum_meetings", "joined_at")
