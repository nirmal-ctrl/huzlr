"""Indexes for AI Worker and execution cursor pagination."""
from alembic import op

revision = "f4a5b6c7d8e9"
down_revision = "f3a4b5c6d7e8"
branch_labels = depends_on = None


def upgrade():
    op.create_index("ix_ai_workers_project_cursor", "ai_workers", ["project_id", "created_at", "id"])
    op.create_index("ix_ai_worker_executions_worker_cursor", "ai_worker_executions", ["worker_id", "created_at", "id"])


def downgrade():
    op.drop_index("ix_ai_worker_executions_worker_cursor", table_name="ai_worker_executions")
    op.drop_index("ix_ai_workers_project_cursor", table_name="ai_workers")
