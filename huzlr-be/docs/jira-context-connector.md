# Jira context connector

The implemented flow is **Jira Cloud site → Jira space (REST project ID) → optional saved filter → selected Huzlr project → versioned evidence → context graph → authorized agent tools**. Importing Jira records does not create local Huzlr issues or change source issues.

## Start the service

1. Configure `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`, `JIRA_REDIRECT_URI`, and a persistent Fernet `ENCRYPTION_KEY` in the backend environment. The API and both workers must share this encryption key, database and context settings. Never regenerate the key for existing connections.
2. Register the exact callback URL in the Atlassian OAuth app. Enable the scopes listed in `JIRA_SCOPES` in `app/core/config.py`. Existing connections need fresh consent for newly added Jira Software scopes.
3. Configure `CONTEXT_ENABLED=true` and reachable `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`. Optional embedding/extraction needs `GEMINI_API_KEY`. Private voice tools also need `CONTEXT_DELEGATION_SECRET` shared by API and workers.
4. Apply the migration from the backend directory:

   ```bash
   .venv/bin/alembic upgrade head
   ```

5. Run **both** persistent workers, independently of the API:

   ```bash
   PYTHONPATH=app .venv/bin/python -m jira_worker
   PYTHONPATH=app .venv/bin/python -m context_worker --reconcile
   ```

6. In the frontend, choose **Bring Existing Work → Connect Jira**, then choose site, Jira space, destination project, and optional numeric saved-filter ID. The filter is intersected with the selected source space. The API queues work immediately; closing the import dialog does not stop it. Resume progress on `/projects/{projectId}/context`, which offers resync and source disconnect.

For container deployment, `deploy/gcp/compose.yaml` includes an opt-in `context` profile. Set the backend `.env` to database/Neo4j addresses reachable **inside the worker containers**, then run:

```bash
docker compose --env-file huzl/.env -f deploy/gcp/compose.yaml --profile context up --build -d jira-worker context-worker
```

Apply migrations before deploying new API and workers. This implementation has been tested with isolated databases and a fake Jira provider; real tenant OAuth consent, webhook delivery, production deployment, and large-space load tests remain deployment acceptance checks.

## Coverage

| Source | Implemented behavior |
| --- | --- |
| Issues | Enhanced JQL search with every `nextPageToken`; all returned fields and custom values retained, excluding embedded comment/worklog previews |
| Comments, history, worklogs, remote links | Dedicated complete collections, bounded pages, durable checkpoints, independent child rescans during incremental sync |
| Metadata | Space details, field definitions, components, versions, accessible boards/configurations and scrum-board sprints |
| Relationships | Parent/subtask hierarchy, explicit directed blocking links, other related links, assignee/reporter, releases/components, structured sprint fields |
| Attachments | Metadata plus bounded UTF-8 text, HTML, CSV, JSON, XML and YAML content; restricted-comment attachment permissions checked separately |
| Unsupported content | PDF, image/OCR, archives, unsupported encodings and oversized attachments have coverage categories; external documents remain references |
| Other products | Atlassian Projects, Confluence page bodies, JSM/JPD-specific objects, app-owned resources, inaccessible/archived/deleted source content are outside this adapter |

Records retain immutable source IDs, raw version payloads, hashes and source URLs. Long evidence is chunked with exact source offsets. Scope counts come from complete live accessible issue enumeration; search results are not treated as project totals. These API enumerations are not atomic snapshots.

`GET /api/v1/jira/bindings/{id}` reports run/task coverage, connection health, structured graph readiness, optional enrichment readiness, and webhook status. A partial import remains partial when a dataset is unavailable. Unsupported optional attachment formats appear as exclusions even when the supported import finishes. `POST /bindings/{id}/sync` with `{"full":true}` retries the complete import and reconciliation.

## Freshness and access

Polling is scheduled every 300 seconds by default; a run may take longer because it reads each retained issue's child collections. Full reconciliation runs daily and catches disappeared work items and changed saved-filter membership. Each initial import has a catch-up enumeration from its start time. Rate limits and temporary errors defer tasks without advancing their checkpoints. Task leases and database locks prevent concurrent retries from publishing stale batches.

Structured graph publication and optional model enrichment have separate revisions and retries. A model outage leaves the graph usable. Exhausted enrichment retries can be restarted through project reindexing or source sync. Keyword search remains available when query embeddings fail.

Imported sources belong to the connected user. Huzlr membership alone does not grant another user access to Jira evidence. Every search, graph, claim and exact-source tool checks the active personal binding and live source visibility/version. Old graph versions are suppressed. Chat rechecks all Jira inputs after generation and rejects the answer if source access or evidence changed. Private Jira conversations are excluded from reusable chat history and automatic shared notes. Shared meeting delegates cannot access personal Jira sources; private voice rooms can use the owner's delegated tools.

Disconnect purges source objects/versions, derived artifacts/claims and affected private chat history, queues graph cleanup, and immediately disables retrieval. Failed remote webhook deletion does not delay local revocation; the subscription eventually expires. Keep normal database/backup retention policies in mind when administering stored evidence.

## Optional webhooks

Set `JIRA_WEBHOOKS_ENABLED=true` and `JIRA_WEBHOOK_BASE_URL` to the public HTTPS application base URL registered with Atlassian. Reconnect with consent for the added `manage:jira-webhook` and `read:issue-details:jira` scopes. The worker registers issue-created/updated/deleted subscriptions and renews them after 20 days. At the provider's per-user/site capacity, imports continue through polling.

The receiver validates an expiring HS256 bearer token with the OAuth client secret and matches the provider's subscription ID. Webhooks only make canonical API synchronization due; webhook issue fields never enter the graph. Duplicate hints coalesce. Validate the bearer claim contract with the configured tenant before enabling webhooks in production. [Atlassian's dynamic webhook documentation](https://developer.atlassian.com/cloud/jira/software/webhooks/) describes authentication, expiry and registration limits.

## Verification

The tests never use the database URL from `.env` for integration runs. They create disposable schemas on the dedicated test ports and use a paginated fake Jira provider:

```bash
docker compose -p huzlr-jira-test -f compose.context-test.yml up -d --wait
PYTHONPATH=app .venv/bin/python -m unittest discover -s tests -v
CONTEXT_INTEGRATION_TESTS=1 PYTHONPATH=app .venv/bin/python -m unittest discover -s tests -p '*integration.py' -v
```

Coverage includes short server pages, replay, child edits without an issue update, source removal, changed graph versions, lease/checkpoint fencing, concurrent token rotation, OAuth state ownership/replay, attachment size/redirect restrictions, webhook signatures/hints, complete overview counts, and revocation during answer generation. Native graph and agent routing regression tests remain part of the suite.

The current projector still rebuilds a complete project partition. Benchmark large Jira spaces before setting a production size/SLO. The visibility candidate limit is reported as truncation; exact work-item and paginated evidence tools provide access beyond a bounded search packet.
