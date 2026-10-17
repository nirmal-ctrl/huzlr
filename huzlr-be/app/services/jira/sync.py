"""Transactional source batches, resumable pagination and coverage manifests."""
import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from uuid import uuid4

from sqlalchemy import select, text, update
from models.context import ContextJob
from models.jira import JiraBinding, JiraConnection, JiraSyncRun, JiraSyncTask, JiraSourceObject, JiraSourceVersion, now
from core.config import settings
from services.context_text import digest
from services.jira.client import JiraError, offset_page, segment, source_jql, utc
from services.jira.attachments import extract_attachment

DATASETS = ["space", "fields", "components", "versions", "boards", "issues"]
ISSUE_DATASETS = ["comments", "changelog", "worklogs", "remote_links"]
KINDS = {"space": "space", "fields": "field", "components": "component", "versions": "version",
    "boards": "board", "sprints": "sprint", "board_config": "board_config", "comments": "comment",
    "changelog": "change", "worklogs": "worklog", "remote_links": "remote_link", "attachment_content": "attachment_content"}


def normalize_issue(value):
    # Embedded subresource previews have separate visibility/pagination and must not enter issue text.
    fields = {k: v for k, v in value.get("fields", {}).items() if k not in {"comment", "worklog"}}
    return {"id": str(value["id"]), "key": value["key"], "fields": fields}


async def enqueue_context(db, binding, kind="jira.batch"):
    await db.execute(text("SELECT context_enqueue(:pid, :wid, :kind, CAST(:payload AS jsonb))"),
        {"pid": binding.project_id, "wid": binding.workspace_id, "kind": kind,
         "payload": json.dumps({"binding_id": binding.id, "revision": binding.revision})})


async def queue_run(db, binding, full=False):
    binding = await db.scalar(select(JiraBinding).where(JiraBinding.id == binding.id).with_for_update())
    existing = await db.scalar(select(JiraSyncRun).where(JiraSyncRun.binding_id == binding.id,
        JiraSyncRun.status.in_(["queued", "running"])))
    if existing:
        binding.next_sync_at = now() + timedelta(seconds=max(60, settings.JIRA_SYNC_INTERVAL_SECONDS))
        return existing
    full = full or not binding.synced_at or not binding.reconciled_at or (
        now() - utc(binding.reconciled_at)).total_seconds() >= settings.JIRA_RECONCILE_INTERVAL_SECONDS
    run = JiraSyncRun(id=str(uuid4()), binding_id=binding.id, mode="full" if full else "incremental")
    db.add(run)
    await db.flush()
    for dataset in DATASETS:
        db.add(JiraSyncTask(run_id=run.id, dataset=dataset, target_id=""))
    if not full:
        # Comment/worklog edits do not reliably advance issue.updated. Re-enumerate
        # retained child collections independently of the issue-search watermark.
        await db.execute(text("""INSERT INTO jira_sync_tasks
            (id, run_id, dataset, target_id, cursor, status, attempts, available_at, records, pages)
            SELECT gen_random_uuid()::text, :rid, d.dataset, o.source_id,
                '{}'::json, 'queued', 0, now(), 0, 0
            FROM jira_source_objects o CROSS JOIN
                (VALUES ('comments'), ('changelog'), ('worklogs'), ('remote_links')) AS d(dataset)
            WHERE o.binding_id = :bid AND o.kind = 'issue' AND o.state = 'active'
            ON CONFLICT (run_id, dataset, target_id) DO NOTHING"""), {"rid": run.id, "bid": binding.id})
    binding.next_sync_at = now() + timedelta(seconds=max(60, settings.JIRA_SYNC_INTERVAL_SECONDS))
    await db.flush()
    return run


async def add_task(db, run_id, dataset, target, restart=False):
    # All task expansion occurs while holding the binding lock.
    existing = await db.scalar(select(JiraSyncTask).where(JiraSyncTask.run_id == run_id,
        JiraSyncTask.dataset == dataset, JiraSyncTask.target_id == str(target)))
    if not existing:
        db.add(JiraSyncTask(run_id=run_id, dataset=dataset, target_id=str(target)))
        await db.flush()
    elif restart and existing.status not in {"queued", "running"}:
        existing.cursor, existing.status, existing.attempts = {}, "queued", 0
        existing.pages, existing.records, existing.error = 0, 0, None
        existing.available_at = now()
        # Start a fresh collection generation, including for removals within this run.
        await db.execute(update(JiraSourceObject).where(JiraSourceObject.binding_id ==
            select(JiraSyncRun.binding_id).where(JiraSyncRun.id == run_id).scalar_subquery(),
            JiraSourceObject.kind == KINDS[dataset], JiraSourceObject.issue_id == str(target)
        ).values(seen_run_id=""))


async def store_object(db, binding, run, kind, value, issue_id=None):
    sid = str(value.get("id", digest(json.dumps(value, sort_keys=True, default=str))))
    if kind in {"change", "remote_link"} and issue_id:
        sid = f"{issue_id}:{sid}"
    version = digest(json.dumps(value, sort_keys=True, ensure_ascii=False, default=str))
    row = await db.scalar(select(JiraSourceObject).where(JiraSourceObject.binding_id == binding.id,
        JiraSourceObject.kind == kind, JiraSourceObject.source_id == sid))
    if not row:
        row = JiraSourceObject(binding_id=binding.id, kind=kind, source_id=sid, issue_id=issue_id,
            payload=value, version=version, seen_run_id=run.id)
        db.add(row)
        await db.flush()
    row.payload, row.version, row.seen_run_id, row.fetched_at, row.state = value, version, run.id, now(), "active"
    row.source_updated_at = str(value.get("created") if kind == "change" else value.get("updated") or value.get("fields", {}).get("updated") or "")
    if kind == "change" and row.source_updated_at:
        try:
            row.source_updated_at = utc(datetime.fromisoformat(row.source_updated_at)).isoformat()
        except ValueError:
            row.source_updated_at = ""
    if not await db.scalar(select(JiraSourceVersion.id).where(JiraSourceVersion.object_id == row.id, JiraSourceVersion.version == version)):
        db.add(JiraSourceVersion(object_id=row.id, version=version, payload=value))
    return row


async def fetch_batch(client, binding, run, task):
    """Fetch one page without advancing a checkpoint; persistence is a separate transaction."""
    dataset, target, cursor = task.dataset, task.target_id, task.cursor or {}
    project = segment(binding.jira_project_id)
    if dataset == "attachment_content":
        issue_id, attachment_id = target.split(":", 1)
        issue = await client.get(f"/rest/api/3/issue/{segment(issue_id)}", params={"fields": "project,attachment"})
        if str(issue.get("fields", {}).get("project", {}).get("id")) != binding.jira_project_id:
            raise JiraError(403, "source_scope_changed")
        metadata = next((a for a in issue.get("fields", {}).get("attachment", []) if str(a["id"]) == attachment_id), None)
        if not metadata:
            raise JiraError(404, "attachment_unavailable")
        # This endpoint also checks attachments belonging to restricted comments.
        await client.get(f"/rest/api/3/attachment/{segment(attachment_id)}")
        return [await extract_attachment(client, metadata)], None
    if dataset in ISSUE_DATASETS:
        # Saved-filter and issue security may have changed since the task was queued.
        from services.jira.access import issue_in_scope
        parent = await client.get(f"/rest/api/3/issue/{segment(target)}", params={"fields": "project"})
        if not await issue_in_scope(client, binding, parent):
            raise JiraError(403, "source_scope_changed")
    if dataset in {"issues", "catchup"}:
        jql = source_jql(binding)
        since = run.started_at if dataset == "catchup" else binding.synced_at if run.mode == "incremental" else None
        if since:
            # Jira interprets absolute JQL dates in the querying account's time zone.
            profile = await client.get("/rest/api/3/myself")
            try:
                zone = ZoneInfo(profile["timeZone"])
            except (KeyError, ZoneInfoNotFoundError, TypeError):
                # Unknown time zone: enumerate the full scope rather than miss changes.
                zone = None
            stamp = (utc(since) - timedelta(minutes=5)).astimezone(zone).strftime("%Y-%m-%d %H:%M") if zone else None
            if stamp:
                jql += f' AND updated >= "{stamp}"'
        data = await client.post("/rest/api/3/search/jql", json={"jql": jql + " ORDER BY id ASC",
            "fields": ["*all"], "maxResults": 100, **({"nextPageToken": cursor["token"]} if cursor.get("token") else {})})
        values = data.get("issues")
        if not isinstance(values, list):
            raise JiraError(502, "invalid_provider_response")
        token = data.get("nextPageToken")
        if token and (token == cursor.get("token") or not values):
            raise JiraError(502, "pagination_did_not_advance")
        if data.get("isLast") is False and not token:
            raise JiraError(502, "missing_page_token")
        return values, {"token": token} if token else None
    routes = {"space": (f"/rest/api/3/project/{project}", None), "fields": ("/rest/api/3/field", None),
        "components": (f"/rest/api/3/project/{project}/component", "values"),
        "versions": (f"/rest/api/3/project/{project}/version", "values"),
        "boards": ("/rest/agile/1.0/board", "values"),
        "board_config": (f"/rest/agile/1.0/board/{segment(target)}/configuration", None),
        "sprints": (f"/rest/agile/1.0/board/{segment(target)}/sprint", "values"),
        "comments": (f"/rest/api/3/issue/{segment(target)}/comment", "comments"),
        "changelog": (f"/rest/api/3/issue/{segment(target)}/changelog", "values"),
        "worklogs": (f"/rest/api/3/issue/{segment(target)}/worklog", "worklogs"),
        "remote_links": (f"/rest/api/3/issue/{segment(target)}/remotelink", None)}
    path, key = routes[dataset]
    params = {"startAt": cursor.get("start", 0), "maxResults": 100} if key else {}
    if dataset == "boards":
        params["projectKeyOrId"] = binding.jira_project_id
    data = await client.get(path, params=params)
    if isinstance(data, list):
        return data, None
    if not key:
        return [data], None
    values, next_start = offset_page(data, key, cursor.get("start", 0))
    return values, {"start": next_start} if next_start is not None else None


async def persist_batch(db, binding, run, task, values, next_cursor):
    kind = "issue" if task.dataset in {"issues", "catchup"} else KINDS[task.dataset]
    for value in values:
        if kind == "issue":
            if str(value.get("fields", {}).get("project", {}).get("id")) != binding.jira_project_id:
                raise JiraError(502, "source_scope_mismatch")
            value = normalize_issue(value)
        if kind == "board_config":
            value = {**value, "id": task.target_id}
        if kind == "space":
            binding.project_key, binding.name = value["key"], value["name"]
        row = await store_object(db, binding, run, kind, value,
            task.target_id.split(":")[0] if task.dataset in ISSUE_DATASETS + ["attachment_content"] else None)
        if kind == "issue":
            for dataset in ISSUE_DATASETS:
                await add_task(db, run.id, dataset, row.source_id, restart=task.dataset == "catchup")
            for attachment in value["fields"].get("attachment", []) or []:
                await store_object(db, binding, run, "attachment", attachment, row.source_id)
                await add_task(db, run.id, "attachment_content", f"{row.source_id}:{attachment['id']}")
            await db.execute(update(JiraSourceObject).where(JiraSourceObject.binding_id == binding.id,
                JiraSourceObject.kind.in_(["attachment", "attachment_content"]), JiraSourceObject.issue_id == row.source_id,
                JiraSourceObject.source_id.not_in([str(a["id"]) for a in value["fields"].get("attachment", []) or []])
            ).values(state="unavailable"))
        if kind == "board":
            await add_task(db, run.id, "board_config", row.source_id)
            if value.get("type") == "scrum":
                await add_task(db, run.id, "sprints", row.source_id)
    task.cursor = next_cursor or {}
    task.records += len(values)
    task.pages += 1
    task.status = "queued" if next_cursor is not None else "complete"
    task.lease_token = task.lease_until = task.error = None
    task.attempts = 0
    task.available_at = now()
    if next_cursor is None:
        # Full collection succeeded: hide prior records no longer accessible/in scope.
        if task.dataset in ISSUE_DATASETS:
            await db.execute(update(JiraSourceObject).where(JiraSourceObject.binding_id == binding.id,
                JiraSourceObject.kind == kind, JiraSourceObject.issue_id == task.target_id,
                JiraSourceObject.seen_run_id != run.id).values(state="unavailable"))
        elif task.dataset in {"components", "versions", "boards", "fields"}:
            await db.execute(update(JiraSourceObject).where(JiraSourceObject.binding_id == binding.id,
                JiraSourceObject.kind == kind, JiraSourceObject.seen_run_id != run.id).values(state="unavailable"))
    binding.revision += 1
    run.status = "running"
    await db.flush()
    await enqueue_context(db, binding)


async def finish_run(db, binding, run):
    tasks = list((await db.scalars(select(JiraSyncTask).where(JiraSyncTask.run_id == run.id))).all())
    if any(t.status in {"queued", "running"} for t in tasks):
        return
    if not any(t.dataset == "catchup" for t in tasks) and all(t.status == "complete" for t in tasks if t.dataset == "issues"):
        await add_task(db, run.id, "catchup", "")
        return
    coverage = {}
    for task in tasks:
        item = coverage.setdefault(task.dataset, {"records": 0, "pages": 0, "complete_tasks": 0, "total_tasks": 0, "errors": []})
        item["records"] += task.records
        item["pages"] += task.pages
        item["total_tasks"] += 1
        item["complete_tasks"] += task.status == "complete"
        if task.error and task.error not in item["errors"]:
            item["errors"].append(task.error)
    content = (await db.scalars(select(JiraSourceObject).where(JiraSourceObject.binding_id == binding.id,
        JiraSourceObject.kind == "attachment_content", JiraSourceObject.state == "active"))).all()
    counts = {}
    for row in content:
        category = row.payload.get("coverage", "unavailable")
        counts[category] = counts.get(category, 0) + 1
    coverage.setdefault("attachment_content", {}).update({"enabled": settings.JIRA_ATTACHMENT_TEXT_ENABLED,
        "formats": "UTF-8 text, HTML, CSV, JSON, XML, YAML", "exclusions": "PDF, images, archives and other binary formats", "results": counts})
    coverage["external_documents"] = {"status": "references_only", "reason": "Separate source authorization required"}
    run.coverage, run.finished_at = coverage, now()
    run.status = "complete" if all(t.status == "complete" for t in tasks) else "partial"
    if run.status == "complete":
        run.error = None
    enumeration_ok = all(t.status == "complete" for t in tasks if t.dataset in {"issues", "catchup"})
    if enumeration_ok:
        binding.synced_at = run.started_at
        if run.mode == "full":
            binding.reconciled_at = now()
            missing = select(JiraSourceObject.source_id).where(JiraSourceObject.binding_id == binding.id,
                JiraSourceObject.kind == "issue", JiraSourceObject.seen_run_id != run.id)
            await db.execute(update(JiraSourceObject).where(JiraSourceObject.binding_id == binding.id,
                JiraSourceObject.issue_id.in_(missing)).values(state="unavailable"))
            await db.execute(update(JiraSourceObject).where(JiraSourceObject.binding_id == binding.id,
                JiraSourceObject.kind == "issue", JiraSourceObject.seen_run_id != run.id).values(state="unavailable"))
    binding.revision += 1
    await enqueue_context(db, binding, "jira.run_finished")


async def run_status(db, binding):
    run = await db.scalar(select(JiraSyncRun).where(JiraSyncRun.binding_id == binding.id).order_by(JiraSyncRun.started_at.desc()).limit(1))
    tasks = [] if not run else (await db.scalars(select(JiraSyncTask).where(JiraSyncTask.run_id == run.id))).all()
    job = await db.get(ContextJob, binding.project_id)
    connection = await db.get(JiraConnection, binding.connection_id)
    groups = {}
    for task in tasks:
        item = groups.setdefault(task.dataset, {"dataset": task.dataset, "records": 0, "pages": 0, "statuses": [], "error": None})
        item["records"] += task.records
        item["pages"] += task.pages
        item["statuses"].append(task.status)
        item["error"] = item["error"] or task.error
    for item in groups.values():
        states = item.pop("statuses")
        item["status"] = "running" if "running" in states else "queued" if "queued" in states else "partial" if any(s != "complete" for s in states) else "complete"
    return {"id": binding.id, "project_id": binding.project_id, "name": binding.name, "key": binding.project_key,
        "cloud_id": binding.cloud_id, "filter_id": binding.filter_id, "status": binding.status,
        "connection_status": connection.status if connection else "disconnected",
        "webhook": {"enabled": settings.JIRA_WEBHOOKS_ENABLED, "registered": bool(binding.webhook_id),
            "expires_at": binding.webhook_expires_at, "error": binding.webhook_error},
        "synced_at": binding.synced_at, "revision": binding.revision,
        "graph": "ready" if job and job.applied_revision >= job.revision else "pending",
        "enrichment": "ready" if job and job.enrichment_revision >= job.revision else "retrying" if job and job.enrichment_error else "pending",
        "run": None if not run else {"id": run.id, "status": run.status, "mode": run.mode, "error": run.error,
            "coverage": run.coverage, "finished_at": run.finished_at,
            "tasks": list(groups.values())}}
