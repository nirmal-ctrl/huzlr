"""Authorized live overview and detail tools complement indexed graph retrieval."""
import json
from collections import Counter, deque
from datetime import timedelta
from types import SimpleNamespace

from fastapi import HTTPException
from sqlalchemy import select
from models.jira import JiraBinding, JiraSourceObject, now
from services.context_text import digest
from services.jira.access import bindings_for, checked_client, issue_in_scope
from services.jira.client import JiraError, segment, source_jql
from services.jira.projector import projection_id, source_text
from services.jira.sync import normalize_issue, run_status


def fact(binding, issue, text_offset=0, text_limit=6000):
    value = normalize_issue(issue)
    source_id = projection_id(binding, "issue", value["id"])
    fields = value["fields"]
    return {"canonical_id": source_id, "source_id": source_id, "source_system": "jira", "kind": "Issue",
        "project_id": binding.project_id, "workspace_id": binding.workspace_id,
        "title": f"{value['key']}: {fields.get('summary', '')}", **excerpt(source_text(SimpleNamespace(kind="issue", payload=value)), text_offset, text_limit),
        "path": f"{binding.site_url}/browse/{value['key']}", "source_version": digest(json.dumps(value, sort_keys=True, ensure_ascii=False)),
        "issue_key": value["key"], "issue_status": (fields.get("status") or {}).get("name", "Unknown"),
        "assignee": (fields.get("assignee") or {}).get("displayName"), "checked_at": now().isoformat(),
        "jira_binding_id": binding.id, "source_entity_type": "issue", "source_entity_id": value["id"]}


def excerpt(text, offset=0, limit=6000):
    end = min(len(text), offset + limit)
    return {"text": text[offset:end], "text_start": offset, "text_end": end,
        "text_length": len(text), "text_truncated": end < len(text),
        "next_text_offset": end if end < len(text) else None}


async def overview(client, binding, db):
    counts, owners, kinds, versions = Counter(), Counter(), Counter(), Counter()
    seen, sample, token, tokens, links = set(), [], None, set(), set()
    while True:
        data = await client.post("/rest/api/3/search/jql", json={"jql": source_jql(binding) + " ORDER BY id ASC",
            "fields": ["summary", "project", "status", "assignee", "issuetype", "fixVersions", "issuelinks"], "maxResults": 100,
            **({"nextPageToken": token} if token else {})})
        for issue in data.get("issues", []):
            if issue["id"] in seen:
                continue
            seen.add(issue["id"])
            fields = issue.get("fields", {})
            if str(fields.get("project", {}).get("id")) != binding.jira_project_id:
                raise JiraError(502, "source_scope_mismatch")
            counts[(fields.get("status") or {}).get("name", "Unknown")] += 1
            owners[(fields.get("assignee") or {}).get("displayName", "Unassigned")] += 1
            kinds[(fields.get("issuetype") or {}).get("name", "Unknown")] += 1
            for version in fields.get("fixVersions", []):
                versions[version.get("name", str(version["id"]))] += 1
            for link in fields.get("issuelinks", []) or []:
                outward = link.get("outwardIssue")
                target = outward or link.get("inwardIssue") or {}
                label = str(link.get("type", {}).get("outward" if outward else "inward", "")).lower()
                if label in {"blocks", "is blocked by"} and target.get("id"):
                    a, b = str(issue["id"]), str(target["id"])
                    links.add((b, a) if label == "is blocked by" else (a, b))
            if len(sample) < 3:
                sample.append(issue["id"])
        token = data.get("nextPageToken")
        if not token:
            if data.get("isLast") is False:
                raise JiraError(502, "missing_page_token")
            break
        if token in tokens or not data.get("issues"):
            raise JiraError(502, "pagination_did_not_advance")
        tokens.add(token)
    examples = []
    for sid in sample:
        try:
            examples.append(fact(binding, await scoped_issue(client, binding, sid)))
        except JiraError:
            continue
    state = await run_status(db, binding)
    visible_links = {(a, b) for a, b in links if a in seen and b in seen}
    summary = {"space": binding.name, "key": binding.project_key, "delivery_filter_id": binding.filter_id,
        "visible_work_items": len(seen), "status_counts": dict(counts), "owners": dict(owners),
        "issue_types": dict(kinds), "release_scope": dict(versions), "source_checked_at": now().isoformat(),
        "directed_blocking_links": len(visible_links), "blocked_work_items": len({b for a, b in visible_links}),
        "dependency_semantics": "Explicit configured blocking links with both endpoints visible and in scope; resolution is not inferred",
        "sync": {**{k: state[k] for k in ["synced_at", "graph", "revision"]},
            "run_status": state["run"]["status"] if state["run"] else None,
            "coverage": state["run"]["coverage"] if state["run"] else {}},
        "count_semantics": "Accessible inventory enumerated at query time; source may change during pagination"}
    source_id = projection_id(binding, "overview", str(binding.user_id))
    stable = {k: summary[k] for k in ["space", "key", "delivery_filter_id", "visible_work_items", "status_counts", "owners", "issue_types", "release_scope", "directed_blocking_links", "blocked_work_items"]}
    return [{"canonical_id": source_id, "kind": "ProjectOverview", "source_system": "jira", "source_id": source_id,
        "title": f"Jira overview: {binding.name}", "text": json.dumps(summary, default=str),
        "project_id": binding.project_id, "workspace_id": binding.workspace_id,
        "path": f"{binding.site_url}/browse/{binding.project_key}", "checked_at": summary["source_checked_at"],
        "jira_binding_id": binding.id, "source_entity_type": "overview", "source_version": digest(json.dumps(stable, sort_keys=True))}, *examples]


async def scoped_issue(client, binding, value):
    issue = await client.get(f"/rest/api/3/issue/{segment(value)}", params={"fields": "*all"})
    if not await issue_in_scope(client, binding, issue):
        raise JiraError(404, "work_item_outside_scope")
    return issue


async def dependencies(client, binding, issue, limit):
    pending, seen, facts, edges = deque([(issue, 0)]), set(), [], []
    boundary = False
    while pending and len(facts) < limit:
        current, depth = pending.popleft()
        if current["id"] in seen:
            continue
        seen.add(current["id"])
        facts.append(fact(binding, current))
        for link in current.get("fields", {}).get("issuelinks", []):
            outward = link.get("outwardIssue")
            target = outward or link.get("inwardIssue") or {}
            label = str(link.get("type", {}).get("outward" if outward else "inward", "")).lower()
            if label not in {"blocks", "is blocked by"} or not target.get("id"):
                continue
            if str(target["id"]) not in seen:
                if depth >= 3 or len(pending) + len(facts) >= limit:
                    boundary = True
                    continue
                try:
                    target_value = await scoped_issue(client, binding, target["id"])
                    pending.append((target_value, depth + 1))
                except JiraError:
                    boundary = True
                    continue
            a, b = projection_id(binding, "issue", current["id"]), projection_id(binding, "issue", target["id"])
            if label == "is blocked by":
                a, b = b, a
            edges.append({"source": a, "target": b, "kind": "BLOCKS", "source_id": projection_id(binding, "issue", current["id"])})
    allowed = {f["canonical_id"] for f in facts}
    return {"facts": facts, "relationships": [e for e in edges if e["source"] in allowed and e["target"] in allowed],
        "truncated": bool(pending) or boundary, "boundary_or_unavailable_dependency": boundary}


async def source_evidence(client, binding, issue, request):
    routes = {"comments": ("comment", "comments", "comment"), "changelog": ("changelog", "values", "change"),
        "worklogs": ("worklog", "worklogs", "worklog")}
    if request.dataset in {"attachments", "attachment_text"}:
        records, kind = issue.get("fields", {}).get("attachment", []) or [], "attachment"
    else:
        route, key, kind = routes[request.dataset]
        records = []
        async for page in client.pages(f"/rest/api/3/issue/{segment(issue['id'])}/{route}", key=key):
            records.extend(page)
            if len(records) >= request.cursor + request.limit + 1:
                break
    selected = records[request.cursor:request.cursor + request.limit]
    facts = []
    for row in selected:
        if request.dataset in {"attachments", "attachment_text"}:
            try:
                await client.get(f"/rest/api/3/attachment/{segment(row['id'])}")
                if request.dataset == "attachment_text":
                    from services.jira.attachments import extract_attachment
                    row, kind = await extract_attachment(client, row), "attachment_content"
            except JiraError:
                continue
        sid = f"{issue['id']}:{row['id']}" if kind == "change" else str(row["id"])
        source_id = projection_id(binding, kind, sid)
        facts.append({"canonical_id": source_id, "source_id": source_id, "source_system": "jira",
            "kind": kind, "title": f"{issue['key']} {kind}", **excerpt(source_text(SimpleNamespace(kind=kind, payload=row)), request.text_offset, request.text_limit),
            "path": f"{binding.site_url}/browse/{issue['key']}", "project_id": binding.project_id,
            "workspace_id": binding.workspace_id, "checked_at": now().isoformat(), "jira_binding_id": binding.id,
            "source_entity_type": kind, "source_entity_id": str(row["id"]), "issue_id": issue["id"],
            "source_version": digest(json.dumps(row, sort_keys=True, ensure_ascii=False, default=str))})
    next_cursor = request.cursor + request.limit if len(records) > request.cursor + request.limit else None
    return {"facts": facts, "relationships": [], "next_cursor": next_cursor, "truncated": next_cursor is not None}


async def context_tool(db, session, request):
    if request.project_id not in session.project_ids:
        raise HTTPException(403, "Project is outside the selected context")
    bindings = await bindings_for(db, session.user_id, [request.project_id])
    result = {"scope": {"project_id": request.project_id}, "facts": [], "relationships": [], "sources": [],
        "truncated": False, "warnings": [], "coverage": [], "checked_at": now().isoformat()}
    for binding in bindings:
        status = await run_status(db, binding)
        result["coverage"].append({"binding_id": binding.id, "space": binding.name, "filter_id": binding.filter_id,
            "synced_at": status["synced_at"], "graph": status["graph"], "run": status["run"]})
        try:
            async with await checked_client(db, binding) as client:
                if request.operation == "overview":
                    await client.get(f"/rest/api/3/project/{segment(binding.jira_project_id)}")
                    packet = {"facts": await overview(client, binding, db)}
                elif request.operation == "changes":
                    # Cached candidates are revalidated against their exact live history version.
                    from services.jira.access import verify_sources
                    from services.jira.projector import source_text
                    stamp = (now() - timedelta(days=request.days)).isoformat()
                    rows = (await db.scalars(select(JiraSourceObject).where(JiraSourceObject.binding_id == binding.id,
                        JiraSourceObject.kind == "change", JiraSourceObject.state == "active")
                        .where(JiraSourceObject.source_updated_at >= stamp)
                        .order_by(JiraSourceObject.source_updated_at.desc(), JiraSourceObject.source_id)
                        .offset(request.cursor).limit(request.limit + 1))).all()
                    keys = await verify_sources(db, session.user_id, [request.project_id], [r.id for r in rows])
                    if len(keys) < len(rows):
                        result["warnings"].append("Some imported changes are unavailable or have changed")
                    selected = [r for r in rows[:request.limit] if f"{r.id}:{r.version}" in keys
                        and str(r.payload.get("created", ""))[:10] >= stamp[:10]]
                    packet = {"facts": [{"canonical_id": projection_id(binding, r.kind, r.source_id),
                        "source_id": projection_id(binding, r.kind, r.source_id), "source_system": "jira", "kind": "ChangeEvent",
                        "title": "Jira change", **excerpt(source_text(r), request.text_offset, request.text_limit), "path": f"{binding.site_url}/browse/{binding.project_key}",
                        "project_id": binding.project_id, "workspace_id": binding.workspace_id,
                        "jira_object_id": r.id, "source_version": r.version} for r in selected],
                        "next_cursor": request.cursor + request.limit if len(rows) > request.limit else None,
                        "truncated": len(rows) > request.limit}
                else:
                    if not request.issue:
                        raise HTTPException(422, "Choose a work item for this operation")
                    try:
                        issue = await scoped_issue(client, binding, request.issue)
                    except JiraError as exc:
                        if exc.status in {403, 404}:
                            continue
                        raise
                    if request.operation == "item":
                        packet = {"facts": [fact(binding, issue, request.text_offset, request.text_limit)]}
                    elif request.operation == "dependencies":
                        packet = await dependencies(client, binding, issue, request.limit)
                    else:
                        packet = await source_evidence(client, binding, issue, request)
                result["facts"].extend(packet["facts"])
                result["relationships"].extend(packet.get("relationships", []))
                result["truncated"] |= packet.get("truncated", False)
                if packet.get("next_cursor") is not None:
                    result["next_cursor"] = packet["next_cursor"]
        except JiraError as exc:
            result["warnings"].append(exc.category)
    if not bindings:
        result["warnings"].append("No personal Jira source is attached to this project")
    result["sources"] = [{"id": f["canonical_id"], "url": f["path"]} for f in result["facts"]]
    return result


async def assert_current_facts(db, session, facts):
    """Recheck every Jira input after model latency, including uncited facts."""
    from services.jira.access import verify_sources
    private = [f for f in facts if f.get("source_system") == "jira"]
    indexed = [f for f in private if f.get("jira_object_id")]
    allowed = await verify_sources(db, session.user_id, session.project_ids, [f["jira_object_id"] for f in indexed])
    if any(f"{f['jira_object_id']}:{f['source_version']}" not in allowed for f in indexed):
        raise HTTPException(409, "Jira evidence changed or access expired while answering; please retry")
    bindings = {b.id: b for b in await bindings_for(db, session.user_id, session.project_ids)}
    for bid in {f.get("jira_binding_id") for f in private if not f.get("jira_object_id")}:
        binding = bindings.get(bid)
        if not binding:
            raise HTTPException(409, "Jira source is no longer connected; please retry")
        try:
            async with await checked_client(db, binding) as client:
                for old in [f for f in private if f.get("jira_binding_id") == bid and not f.get("jira_object_id")]:
                    if old.get("source_entity_type") == "overview":
                        current = (await overview(client, binding, db))[0]
                    elif old.get("source_entity_type") == "issue":
                        current = fact(binding, await scoped_issue(client, binding, old["source_entity_id"]))
                    else:
                        raise JiraError(503, "verification_unavailable")
                    if current["source_version"] != old["source_version"]:
                        raise JiraError(409, "source_changed")
        except JiraError:
            raise HTTPException(409, "Jira evidence changed or access expired while answering; please retry") from None


async def visible_claims(db, user_id, project_id, claims):
    from services.jira.access import verify_sources
    bindings = {b.id: b for b in await bindings_for(db, user_id, [project_id])}
    rows = (await db.scalars(select(JiraSourceObject).where(JiraSourceObject.binding_id.in_(list(bindings)),
        JiraSourceObject.state == "active"))).all()
    sources = {projection_id(bindings[r.binding_id], r.kind, r.source_id): r for r in rows}
    needed = [sources[c.source_id].id for c in claims if c.source_id in sources]
    allowed = await verify_sources(db, user_id, [project_id], needed)
    return [c for c in claims if ":jira:" not in c.source_id or (
        c.source_id in sources and c.source_version == sources[c.source_id].version
        and f"{sources[c.source_id].id}:{sources[c.source_id].version}" in allowed)]
