"""Add the workspace Scrum Master voice mode.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
"""

from alembic import op
import sqlalchemy as sa


revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = depends_on = None


def upgrade():
    op.add_column(
        "scrum_master_settings",
        sa.Column("voice_mode", sa.String(30), nullable=False, server_default="pipeline"),
    )
    op.create_check_constraint(
        "ck_scrum_master_voice_mode",
        "scrum_master_settings",
        "voice_mode IN ('pipeline', 'gemini_live')",
    )


def downgrade():
    op.drop_constraint("ck_scrum_master_voice_mode", "scrum_master_settings", type_="check")
    op.drop_column("scrum_master_settings", "voice_mode")
