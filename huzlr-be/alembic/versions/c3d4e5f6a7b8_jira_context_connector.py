"""Durable read-only Jira connector and source evidence."""
from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = depends_on = None


def upgrade():
    op.add_column("context_jobs", sa.Column("enrichment_revision", sa.BigInteger(), nullable=False, server_default="0"))
    op.add_column("context_jobs", sa.Column("enrichment_attempts", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("context_jobs", sa.Column("enrichment_available_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    op.add_column("context_jobs", sa.Column("enrichment_error", sa.Text()))
    op.add_column("jira_connections", sa.Column("account_id", sa.String(200)))
    op.add_column("jira_connections", sa.Column("sites", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("jira_connections", sa.Column("status", sa.String(30), nullable=False, server_default="connected"))
    definitions = {
        "jira_oauth_states": "digest varchar(64) PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL",
        "jira_project_bindings": """id varchar(36) PRIMARY KEY,
            connection_id bigint NOT NULL REFERENCES jira_connections(id) ON DELETE CASCADE,
            user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            project_id integer NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
            workspace_id bigint NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            cloud_id varchar(100) NOT NULL, site_url varchar(500) NOT NULL,
            jira_project_id varchar(100) NOT NULL, project_key varchar(100) NOT NULL, name varchar(300) NOT NULL,
            filter_id bigint, status varchar(30) NOT NULL, revision bigint NOT NULL,
            synced_at timestamptz, reconciled_at timestamptz, next_sync_at timestamptz NOT NULL, created_at timestamptz NOT NULL,
            webhook_id varchar(100), webhook_expires_at timestamptz, webhook_next_at timestamptz NOT NULL, webhook_error varchar(120),
            UNIQUE(connection_id, project_id, cloud_id, jira_project_id)""",
        "jira_sync_runs": """id varchar(36) PRIMARY KEY,
            binding_id varchar(36) NOT NULL REFERENCES jira_project_bindings(id) ON DELETE CASCADE,
            status varchar(30) NOT NULL, mode varchar(20) NOT NULL, coverage json NOT NULL,
            error varchar(120), started_at timestamptz NOT NULL, finished_at timestamptz""",
        "jira_sync_tasks": """id varchar(36) PRIMARY KEY,
            run_id varchar(36) NOT NULL REFERENCES jira_sync_runs(id) ON DELETE CASCADE,
            dataset varchar(40) NOT NULL, target_id varchar(100) NOT NULL, cursor json NOT NULL,
            status varchar(20) NOT NULL, attempts integer NOT NULL, available_at timestamptz NOT NULL,
            lease_token varchar(36), lease_until timestamptz, error varchar(120), records integer NOT NULL, pages integer NOT NULL,
            UNIQUE(run_id, dataset, target_id)""",
        "jira_source_objects": """id varchar(36) PRIMARY KEY,
            binding_id varchar(36) NOT NULL REFERENCES jira_project_bindings(id) ON DELETE CASCADE,
            kind varchar(40) NOT NULL, source_id varchar(100) NOT NULL, issue_id varchar(100), payload json NOT NULL,
            version varchar(64) NOT NULL, source_updated_at varchar(100), fetched_at timestamptz NOT NULL,
            seen_run_id varchar(36) NOT NULL, state varchar(30) NOT NULL, UNIQUE(binding_id, kind, source_id)""",
        "jira_source_versions": """id varchar(36) PRIMARY KEY,
            object_id varchar(36) NOT NULL REFERENCES jira_source_objects(id) ON DELETE CASCADE,
            version varchar(64) NOT NULL, payload json NOT NULL, recorded_at timestamptz NOT NULL,
            UNIQUE(object_id, version)""",
    }
    for table, definition in definitions.items():
        op.execute(f"CREATE TABLE {table} ({definition})")
    for table, column in [("jira_project_bindings", "project_id"), ("jira_sync_runs", "binding_id"),
        ("jira_sync_tasks", "run_id"), ("jira_source_objects", "binding_id"), ("jira_source_versions", "object_id")]:
        op.create_index(f"ix_{table}_{column}", table, [column])
    op.create_index("jira_one_active_run", "jira_sync_runs", ["binding_id"], unique=True,
        postgresql_where=sa.text("status IN ('queued', 'running')"))
    for table in ["context_artifacts", "context_claims"]:
        op.add_column(table, sa.Column("jira_object_id", sa.String(36), nullable=True))
        op.create_foreign_key(f"fk_{table}_jira_object", table, "jira_source_objects", ["jira_object_id"], ["id"], ondelete="CASCADE")


def downgrade():
    for table in ["context_artifacts", "context_claims"]:
        op.drop_column(table, "jira_object_id")
    for table in ["jira_source_versions", "jira_source_objects", "jira_sync_tasks", "jira_sync_runs", "jira_project_bindings", "jira_oauth_states"]:
        op.drop_table(table)
    for column in ["status", "sites", "account_id"]:
        op.drop_column("jira_connections", column)
    for column in ["enrichment_revision", "enrichment_attempts", "enrichment_available_at", "enrichment_error"]:
        op.drop_column("context_jobs", column)
