"""Context graph control plane and transactional source capture.

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
"""
from alembic import op

revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None

TABLES = [
    """CREATE TABLE context_artifacts (
        id varchar(64) PRIMARY KEY, project_id integer NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
        source_id varchar(500) NOT NULL, version varchar(64) NOT NULL, text text NOT NULL,
        enrichment json NOT NULL, created_at timestamptz NOT NULL DEFAULT now())""",
    """CREATE TABLE context_sessions (
        id varchar(36) PRIMARY KEY, user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workspace_id bigint NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        project_ids json NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL)""",
    """CREATE TABLE context_jobs (
        project_id integer PRIMARY KEY, workspace_id bigint NOT NULL,
        revision bigint NOT NULL DEFAULT 1, applied_revision bigint NOT NULL DEFAULT 0,
        attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
        indexed_at timestamptz, error text, lease_token varchar(36), lease_until timestamptz)""",
    """CREATE TABLE context_turns (
        id varchar(36) PRIMARY KEY, session_id varchar(36) NOT NULL REFERENCES context_sessions(id) ON DELETE CASCADE,
        user_text text NOT NULL, answer json NOT NULL, created_at timestamptz NOT NULL DEFAULT now())""",
    """CREATE TABLE context_events (
        id bigserial PRIMARY KEY, project_id integer NOT NULL, workspace_id bigint NOT NULL,
        kind varchar(120) NOT NULL, payload json NOT NULL, created_at timestamptz NOT NULL DEFAULT now())""",
    "CREATE INDEX ix_context_events_project_id ON context_events(project_id)",
    """CREATE TABLE context_notes (
        id varchar(36) PRIMARY KEY, project_id integer NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
        user_id bigint NOT NULL REFERENCES users(id), text text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())""",
    """CREATE TABLE context_claims (
        id varchar(64) PRIMARY KEY, project_id integer NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
        source_id varchar(500) NOT NULL, source_version varchar(64) NOT NULL, predicate varchar(40) NOT NULL,
        statement text NOT NULL, evidence text NOT NULL, status varchar(20) NOT NULL DEFAULT 'proposed',
        confidence float NOT NULL, reviewed_by bigint REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
        reviewed_at timestamptz)""",
    """CREATE TABLE context_actions (
        id varchar(36) PRIMARY KEY, session_id varchar(36) NOT NULL REFERENCES context_sessions(id) ON DELETE CASCADE,
        project_id integer NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
        payload json NOT NULL, status varchar(20) NOT NULL DEFAULT 'proposed', issue_id integer,
        created_at timestamptz NOT NULL DEFAULT now())""",
    """CREATE TABLE meeting_projects (
        meeting_id bigint NOT NULL REFERENCES scrum_meetings(id) ON DELETE CASCADE,
        project_id integer NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
        configured_by bigint NOT NULL REFERENCES users(id),
        PRIMARY KEY (meeting_id, project_id))""",
]

TRIGGER_TABLES = [
    "projects", "issues", "milestones", "project_documents", "risks", "assumptions",
    "project_inputs", "conversation_logs", "project_versions", "properties", "issue_dependencies",
    "context_notes", "context_claims", "meeting_projects", "scrum_meetings", "meeting_transcript_segments",
]


def upgrade():
    for statement in TABLES:
        op.execute(statement)
    op.execute("""
        CREATE FUNCTION context_enqueue(pid integer, wid bigint, kind text, body jsonb) RETURNS void
        LANGUAGE plpgsql AS $$ BEGIN
            INSERT INTO context_events(project_id, workspace_id, kind, payload) VALUES(pid, wid, kind, body);
            INSERT INTO context_jobs(project_id, workspace_id) VALUES(pid, wid)
            ON CONFLICT (project_id) DO UPDATE SET revision = context_jobs.revision + 1,
                workspace_id = EXCLUDED.workspace_id, available_at = now(), attempts = 0, error = NULL;
        END $$
    """)
    op.execute("""
        CREATE FUNCTION context_capture() RETURNS trigger LANGUAGE plpgsql AS $$
        DECLARE body jsonb; pid integer; wid bigint; ids integer[]; oldbody jsonb;
        BEGIN
            IF TG_OP = 'UPDATE' AND to_jsonb(OLD) = to_jsonb(NEW) THEN RETURN NEW; END IF;
            IF TG_OP = 'DELETE' THEN body := to_jsonb(OLD); ELSE body := to_jsonb(NEW); END IF;
            IF TG_OP != 'INSERT' THEN oldbody := to_jsonb(OLD); END IF;
            IF TG_TABLE_NAME = 'projects' THEN
                ids := ARRAY[(body->>'project_id')::integer];
            ELSIF TG_TABLE_NAME = 'properties' THEN
                IF body->>'entity_type' = 'project' THEN ids := ARRAY[(body->>'entity_id')::integer];
                ELSIF body->>'entity_type' = 'issue' THEN
                    SELECT ARRAY[project_id] INTO ids FROM issues WHERE id = (body->>'entity_id')::integer;
                END IF;
            ELSIF TG_TABLE_NAME = 'issue_dependencies' THEN
                SELECT array_agg(DISTINCT project_id) INTO ids FROM issues
                WHERE id IN ((body->>'issue_id')::integer, (body->>'depends_on_issue_id')::integer,
                    (oldbody->>'issue_id')::integer, (oldbody->>'depends_on_issue_id')::integer);
            ELSIF TG_TABLE_NAME IN ('scrum_meetings', 'meeting_transcript_segments') THEN
                SELECT array_agg(project_id ORDER BY project_id) INTO ids FROM meeting_projects
                WHERE meeting_id = CASE WHEN TG_TABLE_NAME = 'scrum_meetings' THEN (body->>'id')::bigint
                    ELSE (body->>'meeting_id')::bigint END;
            ELSE
                ids := ARRAY[(body->>'project_id')::integer, (oldbody->>'project_id')::integer];
            END IF;
            FOR pid IN SELECT DISTINCT x FROM unnest(ids) x WHERE x IS NOT NULL ORDER BY x LOOP
                IF TG_TABLE_NAME = 'projects' THEN
                    SELECT workspace_id INTO wid FROM teams WHERE id = (body->>'team_id')::bigint;
                ELSE
                    SELECT t.workspace_id INTO wid FROM projects p JOIN teams t ON t.id = p.team_id WHERE p.project_id = pid;
                END IF;
                IF wid IS NOT NULL THEN
                    PERFORM context_enqueue(pid, wid, TG_TABLE_NAME || '.' || lower(TG_OP),
                        jsonb_build_object('before', oldbody, 'after', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE body END));
                END IF;
            END LOOP;
            IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW;
        END $$
    """)
    for table in TRIGGER_TABLES:
        timing = "BEFORE" if table == "projects" else "AFTER"
        # Project inserts need generated ID and parent already present; BEFORE sees both.
        op.execute(f"CREATE TRIGGER context_capture_row {timing} INSERT OR UPDATE OR DELETE ON {table} FOR EACH ROW EXECUTE FUNCTION context_capture()")
    op.execute("""INSERT INTO context_jobs(project_id, workspace_id)
        SELECT p.project_id, t.workspace_id FROM projects p JOIN teams t ON t.id = p.team_id""")


def downgrade():
    for table in reversed(TRIGGER_TABLES):
        op.execute(f"DROP TRIGGER IF EXISTS context_capture_row ON {table}")
    op.execute("DROP FUNCTION context_capture()")
    op.execute("DROP FUNCTION context_enqueue(integer, bigint, text, jsonb)")
    for table in ["meeting_projects", "context_actions", "context_claims", "context_notes", "context_events", "context_jobs", "context_turns", "context_sessions", "context_artifacts"]:
        op.execute(f"DROP TABLE {table}")
