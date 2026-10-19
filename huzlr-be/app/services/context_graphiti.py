"""Graphiti storage for authoritative, source-backed project context.

Use Graphiti's prescribed ontology and transactional Neo4j operations. Structured
source facts do not need an LLM round trip. Current entities also carry the
ContextEntity label used by our permission-aware graph UI. Immutable episodes
retain observed versions; replaced relationships retain their validity windows.
"""
import json
from datetime import datetime, timezone
from uuid import NAMESPACE_URL, uuid5

from graphiti_core.driver.driver import GraphProvider
from graphiti_core.driver.neo4j.operations.episode_node_ops import Neo4jEpisodeNodeOperations
from graphiti_core.driver.neo4j.operations.episodic_edge_ops import Neo4jEpisodicEdgeOperations
from graphiti_core.edges import EntityEdge, EpisodicEdge
from graphiti_core.nodes import EntityNode, EpisodicNode, EpisodeType
from graphiti_core.graph_queries import get_fulltext_indices, get_range_indices
from graphiti_core.models.nodes.node_db_queries import get_entity_node_save_bulk_query
from graphiti_core.models.edges.edge_db_queries import get_entity_edge_save_bulk_query
from services.context_text import digest
from core.config import settings


ENGINE = "graphiti"


def identifier(*parts):
    return str(uuid5(NAMESPACE_URL, json.dumps(parts, separators=(",", ":"))))


def namespace(workspace_id, project_id, binding_id=None):
    suffix = f"_jira_{binding_id}" if binding_id else "_native"
    return f"huzlr_w{workspace_id}_p{project_id}{suffix}"


def source_payload(node):
    return {key: value for key, value in node.items() if key not in {"embedding", "embedding_model", "name_embedding"}}


async def initialize_graphiti(session):
    for statement in get_range_indices(GraphProvider.NEO4J) + get_fulltext_indices(GraphProvider.NEO4J):
        await (await session.run(statement)).consume()


async def store_projection(tx, project_id, workspace_id, revision, nodes, edges):
    """Called inside the existing partition lock and revision-fenced transaction."""
    stamp = datetime.now(timezone.utc)
    rows = await (await tx.run("""MATCH (n:ContextEntity {project_id: $pid, workspace_id: $wid})
        RETURN n.canonical_id AS id, properties(n) AS props""", pid=project_id, wid=workspace_id)).data()
    previous = {row["id"]: row["props"] for row in rows}
    current = {node["canonical_id"]: node for node in nodes}

    # Forget/delete/revoke cleanup must erase historical copies as well as the UI.
    removed = list(set(previous) - set(current))
    if removed:
        await (await tx.run("""MATCH (e:Episodic {project_id: $pid, workspace_id: $wid})
            WHERE e.source_id IN $ids DETACH DELETE e""", pid=project_id, wid=workspace_id, ids=removed)).consume()
        await (await tx.run("MATCH (n:ContextEntity {project_id: $pid, workspace_id: $wid}) WHERE n.canonical_id IN $ids DETACH DELETE n",
            pid=project_id, wid=workspace_id, ids=removed)).consume()
    if not nodes:
        await (await tx.run("MATCH (e:Episodic {project_id: $pid, workspace_id: $wid}) DETACH DELETE e", pid=project_id, wid=workspace_id)).consume()
        return

    entities, episodes, mentions, episode_meta = [], [], [], []
    for node in nodes:
        cid = node["canonical_id"]
        old = previous.get(cid, {})
        uid = identifier("entity", workspace_id, cid)
        group = namespace(workspace_id, project_id, node.get("jira_binding_id"))
        payload = source_payload(node)
        fingerprint = digest(json.dumps(payload, sort_keys=True, default=str))
        changed = old.get("payload_hash") != fingerprint
        ep_id = identifier("episode", workspace_id, project_id, cid, revision, fingerprint) if changed else old["episode_uuid"]
        created = old.get("created_at", stamp)
        if hasattr(created, "to_native"):
            created = created.to_native()
        attributes = {**payload, "payload_hash": fingerprint, "episode_uuid": ep_id, "context_engine": ENGINE}
        if node.get("embedding"):
            attributes.update(embedding=node["embedding"], embedding_model=node["embedding_model"])
        # Enrichment survives unrelated source revisions, never source changes.
        if not changed:
            for field in ("embedding", "embedding_model"):
                if field in old and field not in attributes:
                    attributes[field] = old[field]
        entities.append(EntityNode(uuid=uid, group_id=group, name=str(node["title"]), summary=node.get("text", ""),
            labels=["ContextEntity", node["kind"]], created_at=created, attributes=attributes,
            name_embedding=attributes.get("embedding")))
        # Adopt the existing node in place during the first Graphiti reconciliation.
        if old and not old.get("uuid"):
            await (await tx.run("MATCH (n:ContextEntity {canonical_id: $cid, workspace_id: $wid}) SET n:Entity, n.uuid = $uuid",
                cid=cid, wid=workspace_id, uuid=uid)).consume()
        if changed:
            episodes.append(EpisodicNode(uuid=ep_id, group_id=group, name=str(node["title"]),
                content=json.dumps(payload, sort_keys=True, default=str), source=EpisodeType.json,
                source_description=node.get("source_url") or node.get("path", ""), created_at=stamp, valid_at=stamp))
            mentions.append(EpisodicEdge(uuid=identifier("mention", ep_id, uid), group_id=group,
                source_node_uuid=ep_id, target_node_uuid=uid, created_at=stamp))
            episode_meta.append({"uuid": ep_id, "project_id": project_id, "workspace_id": workspace_id,
                "source_id": cid, "source_version": node["source_version"], "time_basis": "observed",
                "source_system": node.get("source_system", "native"), "jira_object_id": node.get("jira_object_id")})

    # 0.31.1's optimized Neo4j writers call set*VectorProperty even for a null
    # vector. The SDK's portable property writer supports unembedded graphs.
    entity_data = [{"uuid": n.uuid, "name": n.name, "group_id": n.group_id, "summary": n.summary,
        "created_at": n.created_at, "name_embedding": n.name_embedding,
        "labels": n.labels + ["Entity"], **n.attributes} for n in entities]
    await (await tx.run(get_entity_node_save_bulk_query(GraphProvider.NEO4J, entity_data, has_aoss=True), nodes=entity_data)).consume()
    if episodes:
        await Neo4jEpisodeNodeOperations().save_bulk(None, episodes, tx=tx)
        await Neo4jEpisodicEdgeOperations().save_bulk(None, mentions, tx=tx)
        await (await tx.run("UNWIND $batch AS item MATCH (e:Episodic {uuid: item.uuid}) SET e += item", batch=episode_meta)).consume()

    # Legacy typed edges are replaced by Graphiti RELATES_TO edges with name.
    await (await tx.run("""MATCH (a:ContextEntity)-[r]->(b:ContextEntity)
        WHERE a.workspace_id = $wid AND b.workspace_id = $wid
          AND (a.project_id = $pid OR b.project_id = $pid) AND type(r) <> 'RELATES_TO'
        DELETE r""", pid=project_id, wid=workspace_id)).consume()
    existing = await (await tx.run("""MATCH (a:ContextEntity)-[r:RELATES_TO]->(b:ContextEntity)
        WHERE a.workspace_id = $wid AND b.workspace_id = $wid
          AND (a.project_id = $pid OR b.project_id = $pid) AND r.invalid_at IS NULL
        RETURN r.relation_key AS key, r.uuid AS uuid, r.payload_hash AS hash""", pid=project_id, wid=workspace_id)).data()
    active = {row["key"]: row for row in existing}
    endpoints = await (await tx.run("""MATCH (n:ContextEntity {workspace_id: $wid})
        WHERE n.canonical_id IN $ids RETURN n.canonical_id AS id, properties(n) AS props""",
        wid=workspace_id, ids=list({e[k] for e in edges for k in ("source", "target")}))).data()
    endpoint = {r["id"]: r["props"] for r in endpoints}
    wanted, relationships, expired = set(), [], []
    for edge in edges:
        a, b = endpoint.get(edge["source"]), endpoint.get(edge["target"])
        if not a or not b or not a.get("uuid") or not b.get("uuid"):
            continue
        key = identifier("relation", workspace_id, edge["source"], edge["kind"], edge["target"], edge["source_id"])
        wanted.add(key)
        fingerprint = digest(json.dumps([a["payload_hash"], b["payload_hash"]]))
        old = active.get(key)
        if old and old["hash"] == fingerprint:
            continue
        if old:
            expired.append(old["uuid"])
        ep_ids = list(dict.fromkeys([a["episode_uuid"], b["episode_uuid"]]))
        relationships.append(EntityEdge(uuid=identifier("relation-version", key, project_id, revision), name=edge["kind"],
            source_node_uuid=a["uuid"], target_node_uuid=b["uuid"], group_id=a["group_id"],
            fact=f"{a['title']} {edge['kind']} {b['title']}", episodes=ep_ids,
            created_at=stamp, valid_at=stamp, attributes={"source_id": edge["source_id"], "relation_key": key,
                "payload_hash": fingerprint, "workspace_id": workspace_id, "project_id": project_id, "time_basis": "observed"}))
    expired.extend(row["uuid"] for key, row in active.items() if key not in wanted)
    if expired:
        await (await tx.run("MATCH ()-[r:RELATES_TO]->() WHERE r.uuid IN $ids SET r.invalid_at = $stamp, r.expired_at = $stamp",
            ids=expired, stamp=stamp)).consume()
    if relationships:
        relationship_data = [{"uuid": e.uuid, "source_node_uuid": e.source_node_uuid, "target_node_uuid": e.target_node_uuid,
            "name": e.name, "fact": e.fact, "fact_embedding": e.fact_embedding, "group_id": e.group_id,
            "episodes": e.episodes, "created_at": e.created_at, "valid_at": e.valid_at,
            "invalid_at": e.invalid_at, "expired_at": e.expired_at, **e.attributes} for e in relationships]
        await (await tx.run(get_entity_edge_save_bulk_query(GraphProvider.NEO4J, has_aoss=True), entity_edges=relationship_data)).consume()
        await (await tx.run("""UNWIND $batch AS item UNWIND item.episodes AS eid
            MATCH (e:Episodic {uuid: eid}) SET e.entity_edges = reduce(ids = coalesce(e.entity_edges, []), id IN [item.uuid] |
                CASE WHEN id IN ids THEN ids ELSE ids + id END)""",
            batch=[{"uuid": e.uuid, "episodes": e.episodes} for e in relationships])).consume()


class ScopedSearchDriver:
    """Borrow our read-only connection; don't create a second SDK connection pool."""
    provider = GraphProvider.NEO4J
    search_interface = None
    fulltext_syntax = ""

    def __init__(self, driver):
        self.driver = driver

    async def execute_query(self, cypher_query_, **kwargs):
        kwargs.pop("routing_", None)
        # SDK 0.31.1 limits fulltext results before applying SearchFilters. Move
        # that limit to the final, authorized query to avoid tenant starvation.
        cypher_query_ = cypher_query_.replace(
            'queryRelationships("edge_name_and_fact", $query, {limit: $limit})',
            'queryRelationships("edge_name_and_fact", $query)')
        async with self.driver.session(database=settings.NEO4J_DATABASE, default_access_mode="READ") as session:
            result = await session.run(cypher_query_, parameters=kwargs)
            return await result.data(), None, None


async def search_relationships(driver, workspace_id, project_ids, query, jira_ids, limit, fact_ids):
    """Authorize both endpoints before passing any relationship to Graphiti search."""
    from graphiti_core.search.search import edge_search
    from graphiti_core.search.search_config import EdgeSearchConfig, EdgeSearchMethod, EdgeReranker
    from graphiti_core.search.search_filters import SearchFilters
    async with driver.session(database=settings.NEO4J_DATABASE, default_access_mode="READ") as session:
        rows = await (await session.run("""MATCH (a:ContextEntity)-[r:RELATES_TO]->(b:ContextEntity)
            WHERE a.workspace_id = $wid AND b.workspace_id = $wid
              AND a.project_id IN $pids AND b.project_id IN $pids
              AND a.canonical_id IN $fact_ids AND b.canonical_id IN $fact_ids
              AND NOT coalesce(a.status, '') IN ['superseded', 'retracted']
              AND NOT coalesce(b.status, '') IN ['superseded', 'retracted']
              AND r.invalid_at IS NULL AND r.expired_at IS NULL
              AND (coalesce(a.source_system, '') <> 'jira' OR (a.jira_object_id + ':' + a.source_version) IN $jira_ids)
              AND (coalesce(b.source_system, '') <> 'jira' OR (b.jira_object_id + ':' + b.source_version) IN $jira_ids)
            RETURN r.uuid AS id, r.group_id AS namespace,
                [a.canonical_id, b.canonical_id] AS source_ids ORDER BY id LIMIT 2001""",
            wid=workspace_id, pids=project_ids, jira_ids=jira_ids, fact_ids=fact_ids)).data()
    if not rows:
        return [], False
    selected = rows[:2000]
    sources = {row["id"]: row["source_ids"] for row in selected}
    matches, _ = await edge_search(ScopedSearchDriver(driver), None, query, [],
        sorted({row["namespace"] for row in selected}),
        EdgeSearchConfig(search_methods=[EdgeSearchMethod.bm25], reranker=EdgeReranker.rrf),
        SearchFilters(edge_uuids=[row["id"] for row in selected]), limit=limit)
    return [{"id": edge.uuid, "statement": edge.fact, "predicate": edge.name,
        "source_entity_id": edge.source_node_uuid, "target_entity_id": edge.target_node_uuid,
        "episode_ids": edge.episodes, "source_ids": sources[edge.uuid], "valid_at": edge.valid_at.isoformat() if edge.valid_at else None,
        "invalid_at": edge.invalid_at.isoformat() if edge.invalid_at else None,
        "time_basis": "observed"} for edge in matches], len(rows) > 2000


async def history(driver, workspace_id, project_ids, jira_ids, *, source_id=None, as_of=None, limit=30, cursor=0):
    """Observed source history, visible only while the current source is authorized.

    Historical snapshots are deliberately not labeled current facts. An as_of
    cutoff answers what had been recorded by then, not unobserved Jira history.
    """
    async with driver.session(database=settings.NEO4J_DATABASE, default_access_mode="READ") as session:
        rows = await (await session.run("""MATCH (e:Episodic)-[:MENTIONS]->(n:ContextEntity)
            WHERE n.workspace_id = $wid AND n.project_id IN $pids
              AND e.workspace_id = $wid AND e.project_id IN $pids
              AND ($source_id IS NULL OR n.canonical_id = $source_id OR n.source_id = $source_id)
              AND ($as_of IS NULL OR e.created_at <= $as_of)
              AND (coalesce(n.source_system, '') <> 'jira' OR (n.jira_object_id + ':' + n.source_version) IN $jira_ids)
            RETURN e.uuid AS id, e.content AS content, e.created_at AS recorded_at,
                e.source_id AS source_id, e.source_version AS source_version
            ORDER BY recorded_at DESC, id SKIP $cursor LIMIT $limit""",
            wid=workspace_id, pids=project_ids, jira_ids=jira_ids, source_id=source_id,
            as_of=as_of, cursor=cursor, limit=limit + 1)).data()
    return {"engine": ENGINE, "time_basis": "observed", "as_of": as_of.isoformat() if as_of else None,
        "episodes": [{**row, "content": json.loads(row["content"]), "recorded_at": row["recorded_at"].isoformat()}
            for row in rows[:limit]], "next_cursor": cursor + limit if len(rows) > limit else None}
