"""Retire customer deployment and require cloud for active AI Workers.

Revision ID: f2a3b4c5d6e7
Revises: f1a2b3c4d5e6

Historical definitions, executions, events, and enrollment records are retained.
Existing remote work is cancelled, never reassigned to the cloud consumer.
"""

from alembic import op
import sqlalchemy as sa

revision = "f2a3b4c5d6e7"
down_revision = "f1a2b3c4d5e6"
branch_labels = depends_on = None


def upgrade():
    op.execute(sa.text("""INSERT INTO ai_worker_events (execution_id, event_type, payload, created_at)
        SELECT id, 'execution.cancelled', '{"reason":"deployment_retired"}'::json, now()
        FROM ai_worker_executions
        WHERE deployment_kind <> 'cloud' AND status IN ('queued', 'running', 'waiting_approval')"""))
    op.execute(sa.text("""UPDATE ai_worker_executions
        SET status = 'cancelled', cancel_requested = true,
            error = 'Deployment type retired', lease_owner = NULL,
            lease_expires_at = NULL, finished_at = now(), updated_at = now()
        WHERE deployment_kind <> 'cloud' AND status IN ('queued', 'running', 'waiting_approval')"""))
    op.execute(sa.text("""UPDATE ai_workers SET status = 'disabled', updated_at = now()
        WHERE deployment_kind <> 'cloud' AND status <> 'disabled'"""))
    op.execute(sa.text("UPDATE ai_worker_nodes SET status = 'revoked' WHERE status <> 'revoked'"))
    op.create_check_constraint("ck_ai_workers_cloud_active", "ai_workers",
                               "deployment_kind = 'cloud' OR status = 'disabled'")
    op.create_check_constraint("ck_ai_worker_executions_cloud_active", "ai_worker_executions",
                               "deployment_kind = 'cloud' OR status IN ('completed', 'failed', 'cancelled')")


def downgrade():
    op.drop_constraint("ck_ai_worker_executions_cloud_active", "ai_worker_executions", type_="check")
    op.drop_constraint("ck_ai_workers_cloud_active", "ai_workers", type_="check")
    # Never re-enable retired workers, replay cancelled work, or reactivate tokens.
