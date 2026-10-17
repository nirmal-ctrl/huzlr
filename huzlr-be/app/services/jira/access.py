"""Personal source access with live provider checks; old graph data is never permission proof."""
import asyncio
import json
from sqlalchemy import select
from models.jira import JiraBinding, JiraConnection, JiraSourceObject
from services.context_text import digest
from services.jira.client import JiraClient, JiraError, access_token, segment, source_jql
from services.jira.sync import normalize_issue
from services.jira.attachments import extract_attachment


async def bindings_for(db, user_id, project_ids):
    return list((await db.scalars(select(JiraBinding).join(JiraConnection).where(
        JiraBinding.user_id == user_id, JiraBinding.project_id.in_(project_ids),
        JiraBinding.status == "active", JiraConnection.status == "connected"))).all())


async def checked_client(db, binding):
    token = await access_token(db, binding.connection_id)
    async with JiraClient(token) as client:
        sites = await client.get("/oauth/token/accessible-resources")
    if binding.cloud_id not in {s.get("id") for s in sites}:
        raise JiraError(403, "site_access_revoked")
    return JiraClient(token, binding.cloud_id)


async def issue_in_scope(client, binding, issue):
    if str(issue.get("fields", {}).get("project", {}).get("id")) != binding.jira_project_id:
        return False
    if binding.filter_id:
        matches = await client.post("/rest/api/3/jql/match", json={"issueIds": [int(issue["id"])], "jqls": [source_jql(binding)]})
        return int(issue["id"]) in matches.get("matches", [{}])[0].get("matchedIssues", [])
    return True


async def verify_sources(db, user_id, project_ids, object_ids):
    if not object_ids:
        return []
    bindings = {b.id: b for b in await bindings_for(db, user_id, project_ids)}
    rows = (await db.scalars(select(JiraSourceObject).where(JiraSourceObject.id.in_(object_ids),
        JiraSourceObject.binding_id.in_(list(bindings)), JiraSourceObject.state == "active"))).all()
    allowed = []
    for binding in bindings.values():
        selected = [r for r in rows if r.binding_id == binding.id]
        if not selected:
            continue
        try:
            async with await checked_client(db, binding) as client:
                semaphore = asyncio.Semaphore(5)
                issue_cache, resource_cache = {}, {}

                async def issue_value(sid):
                    if sid not in issue_cache:
                        async def fetch():
                            value = await client.get(f"/rest/api/3/issue/{segment(sid)}", params={"fields": "*all"})
                            if not await issue_in_scope(client, binding, value):
                                raise JiraError(403, "source_scope_changed")
                            return value
                        issue_cache[sid] = asyncio.create_task(fetch())
                    return await issue_cache[sid]

                async def check(row):
                    async with semaphore:
                        try:
                            if row.kind == "issue":
                                current = normalize_issue(await issue_value(row.source_id))
                            elif row.issue_id:
                                issue = await issue_value(row.issue_id)
                                if row.kind == "attachment":
                                    current = next((a for a in issue.get("fields", {}).get("attachment", []) if str(a["id"]) == row.source_id), None)
                                    if current:
                                        await client.get(f"/rest/api/3/attachment/{segment(row.source_id)}")
                                elif row.kind == "attachment_content":
                                    metadata = next((a for a in issue.get("fields", {}).get("attachment", []) if str(a["id"]) == row.source_id), None)
                                    if not metadata:
                                        return
                                    await client.get(f"/rest/api/3/attachment/{segment(row.source_id)}")
                                    current = await extract_attachment(client, metadata)
                                elif row.kind in {"comment", "worklog", "remote_link"}:
                                    route = {"comment": "comment", "worklog": "worklog", "remote_link": "remotelink"}[row.kind]
                                    sid = row.source_id.split(":")[-1]
                                    current = await client.get(f"/rest/api/3/issue/{segment(row.issue_id)}/{route}/{segment(sid)}")
                                elif row.kind == "change":
                                    cache_key = (row.issue_id, "changes")
                                    if cache_key not in resource_cache:
                                        async def history():
                                            records = {}
                                            async for page in client.pages(f"/rest/api/3/issue/{segment(row.issue_id)}/changelog"):
                                                records.update({str(v["id"]): v for v in page})
                                            return records
                                        resource_cache[cache_key] = asyncio.create_task(history())
                                    current = (await resource_cache[cache_key]).get(row.source_id.split(":")[-1])
                                else:
                                    return
                            else:
                                routes = {"space": f"/rest/api/3/project/{segment(binding.jira_project_id)}",
                                    "version": f"/rest/api/3/version/{segment(row.source_id)}",
                                    "component": f"/rest/api/3/component/{segment(row.source_id)}",
                                    "board": f"/rest/agile/1.0/board/{segment(row.source_id)}",
                                    "board_config": f"/rest/agile/1.0/board/{segment(row.source_id)}/configuration",
                                    "sprint": f"/rest/agile/1.0/sprint/{segment(row.source_id)}"}
                                if row.kind not in routes:
                                    return
                                # Source project access is also required for otherwise site-wide metadata.
                                await client.get(f"/rest/api/3/project/{segment(binding.jira_project_id)}")
                                current = await client.get(routes[row.kind])
                                if row.kind == "board_config":
                                    current = {**current, "id": row.source_id}
                                if row.kind == "board":
                                    current = {k: current.get(k) for k in row.payload}
                            if current is not None and digest(json.dumps(current, sort_keys=True, ensure_ascii=False, default=str)) == row.version:
                                allowed.append(f"{row.id}:{row.version}")
                        except JiraError:
                            # Provider failures never broaden access or return an earlier content version.
                            return
                await asyncio.gather(*(check(row) for row in selected))
                await asyncio.gather(*issue_cache.values(), *resource_cache.values(), return_exceptions=True)
        except JiraError:
            continue
    return allowed
