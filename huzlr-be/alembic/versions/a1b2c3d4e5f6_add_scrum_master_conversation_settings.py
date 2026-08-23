"""add scrum master conversation settings

Revision ID: a1b2c3d4e5f6
Revises: f7a8b9c0d1e2
Create Date: 2026-08-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f7a8b9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_AGENT_PROMPT = """You are Huzlr Scrum Master, an explicitly identified AI participant in a team meeting.
Listen carefully and facilitate concise standups. Track completed work, planned work,
blockers, decisions, and proposed action items. Never claim to be a human. Do not create,
assign, or change project work without explicit participant confirmation. Keep spoken
responses short, avoid interrupting, and do not reveal information from other workspaces.
At the beginning, state that you are an AI meeting assistant and that transcription or
summarization may be enabled by the workspace administrator."""
DEFAULT_INTRODUCTION = (
    "Hello, I am the Huzlr AI Scrum Master. I will help facilitate and may prepare "
    "meeting notes according to your workspace settings."
)


def upgrade() -> None:
    op.add_column(
        "scrum_master_settings",
        sa.Column("agent_prompt", sa.Text(), nullable=False, server_default=DEFAULT_AGENT_PROMPT),
    )
    op.add_column(
        "scrum_master_settings",
        sa.Column("introduction_message", sa.Text(), nullable=False, server_default=DEFAULT_INTRODUCTION),
    )


def downgrade() -> None:
    op.drop_column("scrum_master_settings", "introduction_message")
    op.drop_column("scrum_master_settings", "agent_prompt")
