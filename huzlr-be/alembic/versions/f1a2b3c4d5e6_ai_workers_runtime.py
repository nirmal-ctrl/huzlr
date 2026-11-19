"""Add durable AI Workers runtime tables.

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
"""

from alembic import op
import sqlalchemy as sa


revision = "f1a2b3c4d5e6"
down_revision = "e5f6a7b8c9d0"
branch_labels = depends_on = None


def upgrade():
    op.create_table(
        "ai_workers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=False),
        sa.Column("model_provider", sa.String(80), nullable=False),
        sa.Column("model_name", sa.String(120), nullable=False),
        sa.Column("deployment_kind", sa.String(30), nullable=False, server_default="cloud"),
        sa.Column("allowed_tools", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("max_steps", sa.Integer(), nullable=False, server_default="12"),
        sa.Column("max_cost_cents", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("deployment_kind IN ('cloud', 'customer_hosted')", name="ck_ai_workers_deployment_kind"),
        sa.CheckConstraint("status IN ('draft', 'deployed', 'disabled')", name="ck_ai_workers_status"),
        sa.CheckConstraint("max_steps BETWEEN 1 AND 100", name="ck_ai_workers_max_steps"),
        sa.CheckConstraint("max_cost_cents BETWEEN 1 AND 100000", name="ck_ai_workers_max_cost"),
    )
    op.create_index("ix_ai_workers_project_id", "ai_workers", ["project_id"])

    op.create_table(
        "ai_worker_executions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("worker_id", sa.String(36), sa.ForeignKey("ai_workers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("requested_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("issues.id", ondelete="SET NULL"), nullable=True),
        sa.Column("task_description", sa.Text(), nullable=False),
        sa.Column("worker_version", sa.Integer(), nullable=False),
        sa.Column("deployment_kind", sa.String(30), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="queued"),
        sa.Column("idempotency_key", sa.String(120), nullable=True),
        sa.Column("attempt", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("available_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("lease_owner", sa.String(120), nullable=True),
        sa.Column("lease_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_requested", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("checkpoint", sa.JSON(), nullable=True),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("usage", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("worker_id", "idempotency_key", name="uq_ai_worker_execution_idempotency"),
        sa.CheckConstraint("status IN ('queued','running','waiting_approval','completed','failed','cancelled')", name="ck_ai_worker_execution_status"),
    )
    op.create_index("ix_ai_worker_executions_worker_id", "ai_worker_executions", ["worker_id"])
    op.create_index("ix_ai_worker_executions_status", "ai_worker_executions", ["status"])
    op.create_index("ix_ai_worker_executions_available_at", "ai_worker_executions", ["available_at"])

    op.create_table(
        "ai_worker_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("execution_id", sa.String(36), sa.ForeignKey("ai_worker_executions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(80), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_ai_worker_events_execution_id", "ai_worker_events", ["execution_id"])

    op.create_table(
        "ai_worker_approvals",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("execution_id", sa.String(36), sa.ForeignKey("ai_worker_executions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tool_name", sa.String(120), nullable=False),
        sa.Column("arguments", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decided_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("decision_note", sa.Text(), nullable=True),
        sa.CheckConstraint("status IN ('pending','approved','rejected')", name="ck_ai_worker_approval_status"),
    )
    op.create_index("ix_ai_worker_approvals_execution_id", "ai_worker_approvals", ["execution_id"])
    op.create_index("ix_ai_worker_approvals_status", "ai_worker_approvals", ["status"])

    op.create_table(
        "ai_worker_nodes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("token_digest", sa.String(64), nullable=False, unique=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="active"),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("status IN ('active','revoked')", name="ck_ai_worker_node_status"),
    )
    op.create_index("ix_ai_worker_nodes_project_id", "ai_worker_nodes", ["project_id"])


def downgrade():
    op.drop_table("ai_worker_nodes")
    op.drop_table("ai_worker_approvals")
    op.drop_table("ai_worker_events")
    op.drop_table("ai_worker_executions")
    op.drop_table("ai_workers")
