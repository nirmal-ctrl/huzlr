"""Allow workspace workers and attach project context to individual executions."""
from alembic import op
import sqlalchemy as sa

revision = "f5a6b7c8d9e0"
down_revision = "f4a5b6c7d8e9"
branch_labels = depends_on = None


def upgrade():
    op.add_column("ai_workers", sa.Column("workspace_id", sa.BigInteger(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True))
    op.alter_column("ai_workers", "project_id", existing_type=sa.Integer(), nullable=True)
    op.create_check_constraint("ck_ai_workers_scope", "ai_workers", "project_id IS NOT NULL OR workspace_id IS NOT NULL")
    op.create_index("ix_ai_workers_workspace_cursor", "ai_workers", ["workspace_id", "created_at", "id"])
    op.add_column("ai_worker_executions", sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=True))
    op.create_index("ix_ai_worker_executions_project_id", "ai_worker_executions", ["project_id"])


def downgrade():
    # Workspace workers cannot be assigned an arbitrary project on rollback.
    op.execute("DO $$ BEGIN IF EXISTS (SELECT 1 FROM ai_workers WHERE project_id IS NULL) THEN RAISE EXCEPTION 'Assign workspace workers to projects before downgrading'; END IF; END $$")
    op.drop_index("ix_ai_worker_executions_project_id", table_name="ai_worker_executions")
    op.drop_column("ai_worker_executions", "project_id")
    op.drop_index("ix_ai_workers_workspace_cursor", table_name="ai_workers")
    op.drop_constraint("ck_ai_workers_scope", "ai_workers", type_="check")
    op.alter_column("ai_workers", "project_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("ai_workers", "workspace_id")
