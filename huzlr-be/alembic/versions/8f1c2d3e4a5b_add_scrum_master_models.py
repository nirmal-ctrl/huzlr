"""add scrum master models

Revision ID: 8f1c2d3e4a5b
Revises: 0ea4b96bd500
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8f1c2d3e4a5b"
down_revision: Union[str, Sequence[str], None] = "0ea4b96bd500"
branch_labels = None
depends_on = None


def _adopt_create_all_schema() -> bool:
    """Repair and adopt tables created by the old application startup hook."""
    inspector = sa.inspect(op.get_bind())
    expected_columns = {
        "scrum_master_settings": {
            "id", "workspace_id", "bot_name", "bot_account_email", "auto_join",
            "join_only_organized", "require_scrum_tag", "join_buffer_minutes",
            "max_meeting_minutes", "transcript_enabled", "summary_enabled",
            "action_items_enabled", "created_at", "updated_at",
        },
        "google_calendar_connections": {
            "id", "workspace_id", "connected_by", "email", "access_token",
            "refresh_token", "token_expires_at", "sync_token", "last_synced_at",
            "created_at", "updated_at",
        },
        "scrum_meetings": {
            "id", "workspace_id", "calendar_event_id", "title", "starts_at",
            "ends_at", "meet_url", "organizer_email", "attendees_count",
            "bot_enabled", "force_join", "status", "job_id", "cancel_requested",
            "claimed_at", "heartbeat_at", "attempt_count", "completed_at",
            "error_code", "error_message", "outputs", "created_at", "updated_at",
        },
        "meeting_transcript_segments": {
            "id", "meeting_id", "speaker_type", "speaker_id", "text",
            "interrupted", "created_at",
        },
    }
    existing_tables = set(inspector.get_table_names()) & set(expected_columns)
    if not existing_tables:
        return False
    if existing_tables != set(expected_columns):
        missing_tables = sorted(set(expected_columns) - existing_tables)
        raise RuntimeError(f"Partial Scrum Master schema; missing tables: {missing_tables}")

    repairable_columns = {
        ("scrum_master_settings", "bot_account_email"),
        ("scrum_meetings", "attempt_count"),
    }
    missing_columns: set[tuple[str, str]] = set()
    for table, expected in expected_columns.items():
        actual = {column["name"] for column in inspector.get_columns(table)}
        missing_columns.update((table, column) for column in expected - actual)
    unsupported = missing_columns - repairable_columns
    if unsupported:
        raise RuntimeError(f"Unsupported Scrum Master schema drift: {sorted(unsupported)}")

    if ("scrum_master_settings", "bot_account_email") in missing_columns:
        op.add_column("scrum_master_settings", sa.Column("bot_account_email", sa.String(255), nullable=True))
    if ("scrum_meetings", "attempt_count") in missing_columns:
        op.add_column(
            "scrum_meetings",
            sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        )

    required_indexes = {
        "scrum_master_settings": {"ix_scrum_master_settings_workspace_id"},
        "google_calendar_connections": {"ix_google_calendar_connections_workspace_id"},
        "scrum_meetings": {
            "ix_scrum_meetings_workspace_id", "ix_scrum_meetings_starts_at",
            "ix_scrum_meetings_status", "ix_scrum_meetings_job_id",
            "uq_scrum_meeting_calendar_event",
        },
        "meeting_transcript_segments": {
            "ix_meeting_transcript_segments_meeting_id",
            "ix_meeting_transcript_segments_created_at",
        },
    }
    for table, required in required_indexes.items():
        actual = {index["name"] for index in inspector.get_indexes(table)}
        missing = required - actual
        if missing:
            raise RuntimeError(f"Unsupported Scrum Master index drift on {table}: {sorted(missing)}")
    return True


def upgrade() -> None:
    if _adopt_create_all_schema():
        return

    op.create_table(
        "scrum_master_settings",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("workspace_id", sa.BigInteger(), sa.ForeignKey("workspaces.id"), nullable=False, unique=True),
        sa.Column("bot_name", sa.String(120), nullable=False, server_default="Huzlr Scrum Master"),
        sa.Column("bot_account_email", sa.String(255), nullable=True),
        sa.Column("auto_join", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("join_only_organized", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("require_scrum_tag", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("join_buffer_minutes", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("max_meeting_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("transcript_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("summary_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("action_items_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_scrum_master_settings_workspace_id", "scrum_master_settings", ["workspace_id"])

    op.create_table(
        "google_calendar_connections",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("workspace_id", sa.BigInteger(), sa.ForeignKey("workspaces.id"), nullable=False, unique=True),
        sa.Column("connected_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sync_token", sa.Text(), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_google_calendar_connections_workspace_id", "google_calendar_connections", ["workspace_id"])

    op.create_table(
        "scrum_meetings",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("workspace_id", sa.BigInteger(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("calendar_event_id", sa.String(255), nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("meet_url", sa.Text(), nullable=True),
        sa.Column("organizer_email", sa.String(255), nullable=True),
        sa.Column("attendees_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bot_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("force_join", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(40), nullable=False, server_default="scheduled"),
        sa.Column("job_id", sa.String(36), nullable=True, unique=True),
        sa.Column("cancel_requested", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("heartbeat_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_code", sa.String(120), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("outputs", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("workspace_id", "calendar_event_id", name="uq_scrum_meeting_calendar_event"),
    )
    op.create_index("ix_scrum_meetings_workspace_id", "scrum_meetings", ["workspace_id"])
    op.create_index("ix_scrum_meetings_starts_at", "scrum_meetings", ["starts_at"])
    op.create_index("ix_scrum_meetings_status", "scrum_meetings", ["status"])
    op.create_index("ix_scrum_meetings_job_id", "scrum_meetings", ["job_id"])
    op.create_table(
        "meeting_transcript_segments",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("meeting_id", sa.BigInteger(), sa.ForeignKey("scrum_meetings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("speaker_type", sa.String(20), nullable=False),
        sa.Column("speaker_id", sa.String(255), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("interrupted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_meeting_transcript_segments_meeting_id", "meeting_transcript_segments", ["meeting_id"])
    op.create_index("ix_meeting_transcript_segments_created_at", "meeting_transcript_segments", ["created_at"])


def downgrade() -> None:
    op.drop_table("meeting_transcript_segments")
    op.drop_table("scrum_meetings")
    op.drop_table("google_calendar_connections")
    op.drop_table("scrum_master_settings")
