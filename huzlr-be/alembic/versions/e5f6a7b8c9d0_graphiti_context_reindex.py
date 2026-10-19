"""Queue existing projects for Graphiti storage migration.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
"""
from alembic import op

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = depends_on = None


def upgrade():
    op.execute("""INSERT INTO context_jobs(project_id, workspace_id)
        SELECT p.project_id, t.workspace_id FROM projects p JOIN teams t ON t.id = p.team_id
        ON CONFLICT (project_id) DO UPDATE SET revision = context_jobs.revision + 1,
            workspace_id = EXCLUDED.workspace_id, available_at = now(), attempts = 0, error = NULL""")


def downgrade():
    # Queue entries are durable operational work, not schema to remove.
    pass
