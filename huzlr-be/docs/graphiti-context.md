# Graphiti context management

Huzlr uses `graphiti-core[google-genai]==0.31.1` with the existing Neo4j database.
Jira OAuth/synchronization, PostgreSQL source versions, source visibility checks,
claim review, and the durable context job queue remain the control plane.

## Storage and retrieval

- The context worker writes Graphiti `EntityNode`, `EpisodicNode`, `EpisodicEdge`,
  and `EntityEdge` records through the pinned SDK's Neo4j operations/query builders.
  `ContextEntity` is an additional label on the same entity, not a separate graph.
- The prescribed ontology comes from authoritative project/Jira records. An LLM
  cannot invent operational status, ownership, or blocking edges. Existing optional
  extraction still produces reviewable claims, which enter the same Graphiti store.
- Changed source snapshots produce immutable JSON episodes and `MENTIONS` links.
  Unchanged data creates no episodes. A changed or removed relationship expires
  its previous `RELATES_TO` version with `invalid_at` and `expired_at` timestamps.
- Episodes contain the bounded source text/metadata used by the graph. Original
  documents and full Jira payload versions remain in their existing source stores.
- Worker revision fencing, the partition lock, entity/episode writes, relationship
  invalidation, and projection publication share one Neo4j transaction. Retries
  cannot publish part of a graph or overwrite a newer revision.
- Native project and personal Jira-binding namespaces are derived on the server.
  Every query also filters workspace, project, and current source visibility.
- Current retrieval retains scoped semantic/keyword entity retrieval and graph
  traversal, then uses Graphiti relationship search and reciprocal rank fusion.
  Graphiti relationship candidates are restricted to evidence already included in
  the authorized source packet, preserving citation and post-generation checks.
- The 0.31.1 adapter uses the SDK's portable property writes for optional vectors:
  its optimized Neo4j vector procedures reject null embeddings. It also removes
  the SDK fulltext procedure's early limit, applying the final limit after the
  authorized edge filter to avoid global top-k tenant starvation.

## History semantics and privacy

History currently represents **when Huzlr observed a source version**. It does not
reconstruct a graph's real-world state from Jira changelog timestamps. The API
explicitly returns `time_basis: "observed"`; `as_of` filters episodes recorded by
that timestamp. Historical episodes are separate from current facts. Existing
Jira changelog tools remain available for event-time questions.

Current-source visibility is required for all historical Jira versions. The API
checks grants/content versions before and after reading history. Shared meeting
delegates cannot read personal Jira history. Deleted/disconnected sources and
forgotten documents have their associated historical episodes purged when the
durable worker processes the deletion; Jira retrieval is denied immediately by
the existing binding/source checks. Deleting a project purges its episodes too.

The project graph's record details include **Source history → View history**.
The authenticated `POST /api/v1/context/history` and delegated
`POST /api/v1/context/internal/history` accept:

```json
{
  "session_id": "an-existing-context-session-uuid",
  "project_id": 7,
  "source_id": "huzlr:issue:42",
  "as_of": "2026-10-01T00:00:00Z",
  "cursor": 0,
  "limit": 20
}
```

`source_id` and `as_of` are optional. Timestamps must include a timezone. Continue
with `next_cursor` until null. The voice agent's `get_project_history` tool uses
the same delegated endpoint and checks.

## Activate or upgrade

From `huzlr-be`, using the intended development/deployment database environment:

```bash
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/alembic upgrade head
PYTHONPATH=app .venv/bin/python -m context_worker --reconcile
```

Restart the API and voice agents with the updated code. Keep the Jira worker
running. No new service, Neo4j credentials, or model key is required for structured
Graphiti storage/history. Optional existing semantic/extraction settings still
control model use. The migration queues existing projects; reconciliation also
adopts legacy graph nodes in place. Historical observations begin with this
reindex; older source-store versions are not automatically replayed as episodes.

Do not roll back to the previous graph reader without rebuilding the legacy
projection: relationships now use Graphiti's `RELATES_TO` type and `name` field.

## Verification

```bash
PYTHONPATH=app .venv/bin/python -m unittest discover -s tests -v
docker compose -p huzlr-jira-test -f compose.context-test.yml up -d --wait
CONTEXT_INTEGRATION_TESTS=1 PYTHONPATH=app .venv/bin/python -m unittest discover -s tests -p '*integration.py' -v
```

Integration tests use isolated local PostgreSQL/Neo4j, the real pinned Graphiti
SDK and a mocked Jira provider. They cover legacy adoption, idempotent replay,
historical cutoffs, relationship invalidation, deletion, cross-project links,
tenant/private-source isolation, live Jira revocation and worker retries.

Upstream: [Graphiti](https://github.com/getzep/graphiti),
[namespacing](https://help.getzep.com/graphiti/core-concepts/graph-namespacing).
