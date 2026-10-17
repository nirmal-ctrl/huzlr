"""Deterministic source projection; no model-authored issue state or dependency edges."""
import json
from sqlalchemy import select
from models.jira import JiraBinding, JiraConnection, JiraSourceObject
from services.context_text import chunks
from services.jira.adf import adf_text

NODE_KINDS = {"space": "JiraSpace", "issue": "Issue", "comment": "Comment", "change": "ChangeEvent",
    "worklog": "Worklog", "attachment": "Attachment", "version": "Version", "component": "Component",
    "board": "Board", "board_config": "Board", "sprint": "Sprint", "remote_link": "Document", "attachment_content": "Document"}
PRIVATE_FIELDS = ["source_system", "jira_owner_id", "jira_binding_id", "jira_object_id"]


def projection_id(binding, kind, sid):
    return f"huzlr:{binding.workspace_id}:{binding.project_id}:jira:{binding.id}:{kind}:{sid}"


def readable(value):
    if isinstance(value, dict) and value.get("type") == "doc":
        return adf_text(value).strip()
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    return "" if value is None else str(value)


def source_text(row, field_names=None):
    value = row.payload
    if row.kind == "issue":
        fields = value.get("fields", {})
        lines = [f"{value.get('key', value.get('id', ''))}: {fields.get('summary', '')}"]
        for key, item in fields.items():
            if key not in {"comment", "worklog", "attachment", "issuelinks"} and item is not None:
                lines.append(f"{(field_names or {}).get(key, key)} [{key}]: {readable(item)}")
        return "\n".join(lines)
    if row.kind == "comment":
        return f"{value.get('author', {}).get('displayName', 'Unknown author')} ({value.get('updated', '')}):\n{adf_text(value.get('body'))}"
    if row.kind == "worklog":
        return f"Time logged: {value.get('timeSpent', '')}; {value.get('started', '')}\n{adf_text(value.get('comment'))}"
    if row.kind == "attachment_content":
        return value.get("content", "")
    return readable(value)


def project_binding(binding, rows):
    nodes, edges, artifacts = [], [], []
    objects = {(r.kind, r.source_id): r for r in rows}
    names = {r.source_id: r.payload.get("name", r.source_id) for r in rows if r.kind == "field"}
    root = f"huzlr:project:{binding.project_id}"

    def cid(kind, sid):
        return projection_id(binding, kind, str(sid))

    def edge(a, b, kind, source):
        edges.append({"source": a, "target": b, "kind": kind, "source_id": source})

    for row in rows:
        kind = NODE_KINDS.get(row.kind)
        if not kind:
            continue
        source = cid(row.kind, row.source_id)
        value = row.payload
        fields = value.get("fields", {})
        title = (value.get("key", "") + ": " + fields.get("summary", "")).strip(": ") if row.kind == "issue" else value.get("name") or value.get("filename") or row.kind
        path = f"{binding.site_url}/browse/{value.get('key', binding.project_key)}"
        if row.issue_id and ("issue", row.issue_id) in objects:
            parent = objects[("issue", row.issue_id)]
            path = f"{binding.site_url}/browse/{parent.payload['key']}"
            if row.kind == "comment":
                path += f"?focusedCommentId={row.source_id}"
        content = source_text(row, names)
        extra = {"source_system": "jira", "jira_owner_id": binding.user_id, "jira_binding_id": binding.id,
            "jira_object_id": row.id, "source_entity_id": row.source_id, "source_entity_type": row.kind,
            "source_url": path, "updated_at": row.source_updated_at or "", "source_id": source,
            "source_version": row.version, "workspace_id": binding.workspace_id, "project_id": binding.project_id}
        node = {"canonical_id": source, "kind": kind, "title": title, "text": content[:2400], "path": path,
            "status": "active", **extra}
        if row.kind == "issue":
            node.update(issue_key=value["key"], issue_status=fields.get("status", {}).get("name", "Unknown"),
                issue_type=fields.get("issuetype", {}).get("name", "Unknown"),
                assignee_id=(fields.get("assignee") or {}).get("accountId", ""))
        nodes.append(node)
        if row.issue_id:
            rel = {"comment": "HAS_COMMENT", "change": "HAS_CHANGE", "worklog": "HAS_WORKLOG",
                "attachment": "HAS_ATTACHMENT", "remote_link": "HAS_DOCUMENT", "attachment_content": "HAS_DOCUMENT"}[row.kind]
            edge(cid("issue", row.issue_id), source, rel, source)
        else:
            edge(root, source, "HAS_ISSUE" if row.kind == "issue" else "IMPORTS_FROM" if row.kind == "space" else "PART_OF", source)
        if row.kind == "issue":
            parent = fields.get("parent") or {}
            if parent.get("id") and ("issue", str(parent["id"])) in objects:
                edge(source, cid("issue", parent["id"]), "SUBTASK_OF" if fields.get("issuetype", {}).get("subtask") else "CHILD_OF", source)
            for link in fields.get("issuelinks", []) or []:
                # Use the configured direction/label. Never assume all link types block.
                outward = link.get("outwardIssue")
                target = outward or link.get("inwardIssue") or {}
                if ("issue", str(target.get("id"))) not in objects:
                    continue
                label = str(link.get("type", {}).get("outward" if outward else "inward", "")).lower()
                a, b = source, cid("issue", target["id"])
                if label == "blocks":
                    relation = "BLOCKS"
                elif label == "is blocked by":
                    relation, a, b = "BLOCKS", b, a
                else:
                    relation = "RELATES_TO"
                edge(a, b, relation, source)
            for field, rel, obj_kind in [("fixVersions", "TARGETS_VERSION", "version"),
                ("versions", "AFFECTS_VERSION", "version"), ("components", "IN_COMPONENT", "component")]:
                for item in fields.get(field, []) or []:
                    if (obj_kind, str(item.get("id"))) in objects:
                        edge(source, cid(obj_kind, item["id"]), rel, source)
            for field, rel in [("assignee", "ASSIGNED_TO"), ("reporter", "REPORTED_BY")]:
                person = fields.get(field) or {}
                if person.get("accountId"):
                    # Qualify evidence by issue so revoked issue access also removes ownership evidence.
                    person_id = cid("person", f"{row.source_id}:{person['accountId']}")
                    if not any(n["canonical_id"] == person_id for n in nodes):
                        nodes.append({"canonical_id": person_id, "kind": "Person", "title": person.get("displayName", person["accountId"]),
                            "text": person.get("displayName", ""), "path": path, "status": "active", **extra})
                    edge(source, person_id, rel, source)
            for key, item in fields.items():
                if isinstance(item, list) and any(isinstance(s, dict) and "state" in s and "startDate" in s for s in item):
                    for sprint in item:
                        if isinstance(sprint, dict) and ("sprint", str(sprint.get("id"))) in objects:
                            edge(source, cid("sprint", sprint["id"]), "IN_SPRINT", source)
        if content and row.kind in {"issue", "comment", "worklog", "change", "remote_link", "attachment_content"}:
            artifacts.append({"source_id": source, "version": row.version, "text": content, "path": path, **extra})
            for part in chunks(content):
                chunk_id = f"{source}:chunk:{part['start']}"
                nodes.append({"canonical_id": chunk_id, "kind": "DocumentChunk", "title": title,
                    "text": part["text"], "path": path, "status": "active", "start": part["start"], "end": part["end"], **extra})
                edge(source, chunk_id, "HAS_CHUNK", source)
    return nodes, edges, artifacts


async def project_sources(db, project_id, workspace_id):
    bindings = (await db.scalars(select(JiraBinding).join(JiraConnection).where(
        JiraBinding.project_id == project_id, JiraBinding.workspace_id == workspace_id,
        JiraBinding.status == "active", JiraConnection.status == "connected"))).all()
    nodes, edges, artifacts = [], [], []
    for binding in bindings:
        rows = (await db.scalars(select(JiraSourceObject).where(JiraSourceObject.binding_id == binding.id,
            JiraSourceObject.state == "active"))).all()
        n, e, a = project_binding(binding, rows)
        nodes.extend(n)
        edges.extend(e)
        artifacts.extend(a)
    return nodes, edges, artifacts
