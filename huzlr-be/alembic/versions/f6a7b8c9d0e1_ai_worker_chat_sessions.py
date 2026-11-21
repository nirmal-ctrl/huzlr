"""Persist AI Worker chat sessions and their execution-backed messages."""
from alembic import op
import sqlalchemy as sa

revision = "f6a7b8c9d0e1"
down_revision = "f5a6b7c8d9e0"
branch_labels = depends_on = None


def upgrade():
    op.create_table(
        "ai_worker_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.BigInteger(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("worker_id", sa.String(36), sa.ForeignKey("ai_workers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_ai_worker_sessions_worker_id", "ai_worker_sessions", ["worker_id"])
    op.create_index("ix_ai_worker_sessions_workspace_user_updated", "ai_worker_sessions", ["workspace_id", "created_by", "updated_at"])
    op.add_column("ai_worker_executions", sa.Column("session_id", sa.String(36), sa.ForeignKey("ai_worker_sessions.id", ondelete="SET NULL"), nullable=True))
    op.add_column("ai_worker_executions", sa.Column("conversation", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")))
    op.create_index("ix_ai_worker_executions_session_id", "ai_worker_executions", ["session_id"])
    op.create_table(
        "ai_worker_session_messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("session_id", sa.String(36), sa.ForeignKey("ai_worker_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("execution_id", sa.String(36), sa.ForeignKey("ai_worker_executions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("role IN ('user', 'assistant')", name="ck_ai_worker_session_message_role"),
    )
    op.create_index("ix_ai_worker_session_messages_execution_id", "ai_worker_session_messages", ["execution_id"])
    op.create_index("ix_ai_worker_session_messages_session_created", "ai_worker_session_messages", ["session_id", "created_at", "id"])


def downgrade():
    op.drop_index("ix_ai_worker_session_messages_session_created", table_name="ai_worker_session_messages")
    op.drop_index("ix_ai_worker_session_messages_execution_id", table_name="ai_worker_session_messages")
    op.drop_table("ai_worker_session_messages")
    op.drop_index("ix_ai_worker_executions_session_id", table_name="ai_worker_executions")
    op.drop_column("ai_worker_executions", "conversation")
    op.drop_column("ai_worker_executions", "session_id")
    op.drop_index("ix_ai_worker_sessions_workspace_user_updated", table_name="ai_worker_sessions")
    op.drop_index("ix_ai_worker_sessions_worker_id", table_name="ai_worker_sessions")
    op.drop_table("ai_worker_sessions")
