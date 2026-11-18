"""AI workers foundation

Revision ID: 20261118_ai_workers
Revises: see migration integration notes
"""
# This is a migration template, deliberately NOT wired into the revision graph
# until the current repository head revision has been checked.
from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        "ai_workers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.project_id"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=False),
        sa.Column("model_provider", sa.String(80), nullable=False),
        sa.Column("model_name", sa.String(120), nullable=False),
        sa.Column("deployment_kind", sa.String(30), nullable=False),
        sa.Column("allowed_tools", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_ai_workers_project_id", "ai_workers", ["project_id"])
    op.create_table(
        "ai_worker_executions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("worker_id", sa.String(36), sa.ForeignKey("ai_workers.id"), nullable=False),
        sa.Column("task_description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_ai_worker_executions_worker_id", "ai_worker_executions", ["worker_id"])


def downgrade():
    op.drop_index("ix_ai_worker_executions_worker_id", table_name="ai_worker_executions")
    op.drop_table("ai_worker_executions")
    op.drop_index("ix_ai_workers_project_id", table_name="ai_workers")
    op.drop_table("ai_workers")
