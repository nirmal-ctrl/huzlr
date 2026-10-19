"""Parameterized Neo4j operations; no model-generated query is executable here.

Search uses exact cosine over the authorized project partitions. This avoids
global ANN top-k post-filtering, which can starve small tenants of results.
"""
import re
from contextlib import asynccontextmanager
from core.config import settings

STOP_WORDS = {"the", "is", "are", "what", "which", "why", "how", "do", "does", "and", "or", "to", "for", "of", "in", "on", "me", "please"}

KINDS = {"Project", "Issue", "Milestone", "Document", "DocumentChunk", "Risk", "Assumption", "Meeting", "Note", "Claim",
         "JiraSpace", "Comment", "ChangeEvent", "Worklog", "Attachment", "Version", "Component", "Board", "Sprint", "Person"}
RELATIONS = {"HAS_ISSUE", "HAS_MILESTONE", "HAS_DOCUMENT", "HAS_MEETING", "HAS_NOTE", "HAS_CLAIM",
             "HAS_CHUNK", "PART_OF", "SUBTASK_OF", "DEPENDS_ON", "SUPPORTED_BY", "IMPORTS_FROM", "CHILD_OF",
             "BLOCKS", "RELATES_TO", "ASSIGNED_TO", "REPORTED_BY", "IN_SPRINT", "TARGETS_VERSION", "AFFECTS_VERSION",
             "IN_COMPONENT", "HAS_COMMENT", "HAS_CHANGE", "HAS_WORKLOG", "HAS_ATTACHMENT"}


@asynccontextmanager
async def graph_driver():
    from neo4j import AsyncGraphDatabase
    if not settings.NEO4J_PASSWORD:
        raise RuntimeError("NEO4J_PASSWORD is not configured")
    driver = AsyncGraphDatabase.driver(settings.NEO4J_URI, auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
                                       connection_timeout=10, max_transaction_retry_time=15)
    try:
        yield driver
    finally:
        await driver.close()


async def initialize(driver):
    statements = [
        "CREATE CONSTRAINT context_entity_id IF NOT EXISTS FOR (n:ContextEntity) REQUIRE n.canonical_id IS UNIQUE",
        "CREATE CONSTRAINT context_partition_id IF NOT EXISTS FOR (n:ContextPartition) REQUIRE n.project_id IS UNIQUE",
        "CREATE INDEX context_scope IF NOT EXISTS FOR (n:ContextEntity) ON (n.workspace_id, n.project_id)",
    ]
    async with driver.session(database=settings.NEO4J_DATABASE) as session:
        for statement in statements:
            await (await session.run(statement)).consume()
        from services.context_graphiti import initialize_graphiti
        await initialize_graphiti(session)


async def replace_projection(driver, project_id, workspace_id, revision, nodes, edges):
    for node in nodes:
        if node["kind"] not in KINDS or node["project_id"] != project_id or node["workspace_id"] != workspace_id:
            raise ValueError("Invalid graph node scope or kind")
    for edge in edges:
        if edge["kind"] not in RELATIONS:
            raise ValueError("Invalid graph relationship")

    async def write(tx):
        # Lock the partition inside the Neo4j transaction; stale/replayed jobs cannot overwrite a newer projection.
        result = await tx.run("""MERGE (p:ContextPartition {project_id: $pid})
            ON CREATE SET p.revision = 0
            SET p.lock_version = coalesce(p.lock_version, 0) + 1
            RETURN p.revision AS revision, p.context_engine AS engine""", pid=project_id)
        row = await result.single()
        if row["revision"] > revision or (row["revision"] == revision and row["engine"] == "graphiti"):
            return
        from services.context_graphiti import store_projection
        await store_projection(tx, project_id, workspace_id, revision, nodes, edges)
        await (await tx.run("""MATCH (p:ContextPartition {project_id: $pid})
            SET p.revision = $revision, p.workspace_id = $wid, p.indexed_at = datetime(), p.context_engine = 'graphiti'""",
            pid=project_id, wid=workspace_id, revision=revision)).consume()
    async with driver.session(database=settings.NEO4J_DATABASE) as session:
        await session.execute_write(write)


SEARCH = """
MATCH (n:ContextEntity)
WHERE n.workspace_id = $wid AND n.project_id IN $pids
  AND (coalesce(n.source_system, '') <> 'jira' OR (n.jira_object_id + ':' + n.source_version) IN $jira_ids)
  AND NOT coalesce(n.status, '') IN ['superseded', 'retracted']
WITH n, reduce(score = 0.0, term IN $terms |
    score + CASE WHEN toLower(n.title) CONTAINS term THEN 2.0 ELSE 0.0 END
          + CASE WHEN toLower(n.text) CONTAINS term THEN 1.0 ELSE 0.0 END) AS lexical
WITH n, lexical, CASE WHEN size($vector) > 0 AND n.embedding_model = $model
    AND size(n.embedding) = size($vector)
    THEN vector.similarity.cosine(n.embedding, $vector) ELSE 0.0 END AS semantic
WHERE lexical > 0 OR semantic > 0.45
RETURN n {.*, embedding: null} AS node, lexical + semantic * 3 AS score
ORDER BY score DESC, n.canonical_id LIMIT $limit
"""

LEXICAL_SEARCH = """
MATCH (n:ContextEntity)
WHERE n.workspace_id = $wid AND n.project_id IN $pids
  AND (coalesce(n.source_system, '') <> 'jira' OR (n.jira_object_id + ':' + n.source_version) IN $jira_ids)
  AND NOT coalesce(n.status, '') IN ['superseded', 'retracted']
WITH n, reduce(score = 0.0, term IN $terms |
    score + CASE WHEN toLower(n.title) CONTAINS term THEN 2.0 ELSE 0.0 END
          + CASE WHEN toLower(n.text) CONTAINS term THEN 1.0 ELSE 0.0 END) AS lexical
WHERE lexical > 0
RETURN n {.*, embedding: null} AS node, lexical AS score
ORDER BY score DESC, n.canonical_id LIMIT $limit
"""

NEIGHBORS = """
MATCH (a:ContextEntity)-[r]-(b:ContextEntity)
WHERE a.canonical_id IN $ids AND a.workspace_id = $wid AND a.project_id IN $pids
  AND b.workspace_id = $wid AND b.project_id IN $pids
  AND (coalesce(a.source_system, '') <> 'jira' OR (a.jira_object_id + ':' + a.source_version) IN $jira_ids)
  AND (coalesce(b.source_system, '') <> 'jira' OR (b.jira_object_id + ':' + b.source_version) IN $jira_ids)
  AND NOT coalesce(b.status, '') IN ['superseded', 'retracted']
  AND r.invalid_at IS NULL AND r.expired_at IS NULL
RETURN DISTINCT b {.*, embedding: null} AS node,
  {source: startNode(r).canonical_id, target: endNode(r).canonical_id,
   kind: coalesce(r.name, type(r)), source_id: r.source_id} AS edge
LIMIT $limit
"""


async def search(driver, workspace_id, project_ids, query, vector, limit, jira_ids=None):
    terms = [t for t in dict.fromkeys(re.findall(r"\w{2,}", query.lower())) if t not in STOP_WORDS][:30]
    for prefix in ("depend", "block", "risk", "milestone"):
        if any(t.startswith(prefix) for t in terms):
            terms.append(prefix)
    async with driver.session(database=settings.NEO4J_DATABASE, default_access_mode="READ") as session:
        result = await session.run(SEARCH if vector else LEXICAL_SEARCH, wid=workspace_id, pids=project_ids, terms=terms,
                                   vector=vector, model=settings.CONTEXT_EMBEDDING_MODEL, limit=limit, jira_ids=jira_ids or [])
        ranked = await result.data()
        ids = [r["node"]["canonical_id"] for r in ranked]
        result = await session.run(NEIGHBORS, wid=workspace_id, pids=project_ids, ids=ids, limit=limit * 2, jira_ids=jira_ids or [])
        neighbors = await result.data()
    unique = {r["node"]["canonical_id"]: r["node"] for r in ranked + neighbors}
    facts, size = [], 0
    for node in unique.values():
        node.pop("embedding", None)
        node.pop("name_embedding", None)
        size += len(node.get("text", ""))
        if size > 24000:
            break
        facts.append(node)
    allowed = {n["canonical_id"] for n in facts}
    from services.context_graphiti import search_relationships
    temporal_facts, temporal_truncated = await search_relationships(driver, workspace_id, project_ids, query, jira_ids or [], limit, list(allowed))
    return {"scope": {"workspace_id": workspace_id, "project_ids": project_ids}, "facts": facts,
            "relationships": [r["edge"] for r in neighbors if r["edge"]["source"] in allowed and r["edge"]["target"] in allowed],
            "temporal_facts": temporal_facts, "engine": "graphiti",
            "truncated": len(facts) < len(unique) or temporal_truncated, "retrieval_mode": "graphiti_scoped_hybrid" if vector else "graphiti_scoped_keyword"}


async def project_graph(driver, workspace_id: int, project_id: int, limit: int = 500, jira_ids=None):
    """Return a safe, bounded visualization projection for one authorized project."""
    query = """
    MATCH (n:ContextEntity {workspace_id: $wid, project_id: $pid})
    WHERE NOT coalesce(n.status, '') IN ['superseded', 'retracted']
      AND (coalesce(n.source_system, '') <> 'jira' OR (n.jira_object_id + ':' + n.source_version) IN $jira_ids)
    WITH n ORDER BY CASE n.kind WHEN 'Project' THEN 0 ELSE 1 END, n.kind, n.canonical_id
    WITH collect(n)[..$limit] AS selected
    UNWIND selected AS n
    OPTIONAL MATCH (n)-[r]->(m:ContextEntity {workspace_id: $wid, project_id: $pid})
    WHERE m IN selected AND NOT coalesce(m.status, '') IN ['superseded', 'retracted']
      AND r.invalid_at IS NULL AND r.expired_at IS NULL
    RETURN collect(DISTINCT properties(n)) AS nodes,
    collect(DISTINCT CASE WHEN r IS NULL THEN null ELSE {
        source: n.canonical_id, target: m.canonical_id, kind: coalesce(r.name, type(r)), source_id: r.source_id
    } END) AS relationships
    """
    count_query = """
    MATCH (n:ContextEntity {workspace_id: $wid, project_id: $pid})
    WHERE NOT coalesce(n.status, '') IN ['superseded', 'retracted']
      AND (coalesce(n.source_system, '') <> 'jira' OR (n.jira_object_id + ':' + n.source_version) IN $jira_ids)
    RETURN count(n) AS total
    """
    async with driver.session(database=settings.NEO4J_DATABASE, default_access_mode="READ") as session:
        total_row = await (await session.run(count_query, wid=workspace_id, pid=project_id, jira_ids=jira_ids or [])).single()
        row = await (await session.run(query, wid=workspace_id, pid=project_id, limit=limit, jira_ids=jira_ids or [])).single()
    visible_fields = {"canonical_id", "workspace_id", "project_id", "kind", "title", "text", "path", "status",
                      "confidence", "source_id", "source_version", "updated_at", "source_system", "source_url", "issue_key", "issue_status"}
    nodes = [] if row is None else [{key: value for key, value in dict(node).items() if key in visible_fields}
                                    for node in row["nodes"]]
    relationships = [] if row is None else [dict(edge) for edge in row["relationships"] if edge]
    total = total_row["total"] if total_row else 0
    return {
        "engine": "graphiti",
        "project_id": project_id,
        "nodes": nodes,
        "relationships": relationships,
        "total_nodes": total,
        "truncated": total > len(nodes),
    }


async def jira_candidates(driver, workspace_id, project_ids, user_id, query="", vector=None, limit=80):
    """Unranked private candidates and neighbors; live source checks precede final ranking."""
    terms = [t for t in re.findall(r"\w{2,}", query.lower()) if t not in STOP_WORDS][:30]
    statement = """
    MATCH (n:ContextEntity)
    WHERE n.workspace_id = $wid AND n.project_id IN $pids
      AND n.source_system = 'jira' AND n.jira_owner_id = $uid
      AND NOT coalesce(n.status, '') IN ['superseded', 'retracted']
      AND ($all OR any(term IN $terms WHERE toLower(n.title) CONTAINS term OR toLower(n.text) CONTAINS term)
        OR (size($vector) > 0 AND n.embedding_model = $model AND size(n.embedding) = size($vector)
            AND vector.similarity.cosine(n.embedding, $vector) > 0.45))
    OPTIONAL MATCH (n)-[r]-(m:ContextEntity)
    WHERE m.workspace_id = $wid AND m.project_id IN $pids AND m.jira_owner_id = $uid
      AND r.invalid_at IS NULL AND r.expired_at IS NULL
      AND NOT coalesce(m.status, '') IN ['superseded', 'retracted']
    WITH n.jira_object_id AS first, m.jira_object_id AS neighbor
    UNWIND [first, neighbor] AS object_id
    WITH DISTINCT object_id WHERE object_id IS NOT NULL
    RETURN object_id ORDER BY object_id LIMIT $limit
    """
    async with driver.session(database=settings.NEO4J_DATABASE, default_access_mode="READ") as session:
        rows = await (await session.run(statement, wid=workspace_id, pids=project_ids, uid=user_id,
            terms=terms, all=not query, vector=vector or [], model=settings.CONTEXT_EMBEDDING_MODEL, limit=limit + 1)).data()
    return [r["object_id"] for r in rows[:limit]], len(rows) > limit


async def apply_embeddings(driver, project_id, workspace_id, nodes):
    """Enrichment cannot overwrite a newer source version or hold structured facts hostage."""
    batch = [{"id": n["canonical_id"], "version": n["source_version"], "embedding": n["embedding"],
        "model": n["embedding_model"]} for n in nodes if n.get("embedding")]
    if not batch:
        return
    async with driver.session(database=settings.NEO4J_DATABASE) as session:
        await (await session.run("""UNWIND $batch AS item
            MATCH (n:ContextEntity {canonical_id: item.id, project_id: $pid, workspace_id: $wid})
            WHERE n.source_version = item.version
            SET n.embedding = item.embedding, n.name_embedding = item.embedding, n.embedding_model = item.model""",
            batch=batch, pid=project_id, wid=workspace_id)).consume()
