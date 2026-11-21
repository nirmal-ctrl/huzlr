"""Managed per-execution sandboxes and bounded workspace snapshots."""
from alembic import op
import sqlalchemy as sa

revision = "f3a4b5c6d7e8"
down_revision = "f2a3b4c5d6e7"
branch_labels = depends_on = None


def upgrade():
    op.add_column("ai_workers", sa.Column("sandbox_mode", sa.String(20), nullable=False, server_default="off"))
    op.add_column("ai_workers", sa.Column("max_runtime_seconds", sa.Integer(), nullable=False, server_default="600"))
    op.add_column("ai_worker_executions", sa.Column("environment", sa.JSON(), nullable=True))
    op.create_check_constraint("ck_ai_workers_sandbox_mode", "ai_workers", "sandbox_mode IN ('off', 'docker')")
    op.create_check_constraint("ck_ai_workers_runtime", "ai_workers", "max_runtime_seconds BETWEEN 30 AND 1800")


def downgrade():
    op.drop_constraint("ck_ai_workers_runtime", "ai_workers", type_="check")
    op.drop_constraint("ck_ai_workers_sandbox_mode", "ai_workers", type_="check")
    op.drop_column("ai_worker_executions", "environment")
    op.drop_column("ai_workers", "max_runtime_seconds")
    op.drop_column("ai_workers", "sandbox_mode")
