"""Persistent Jira worker: PYTHONPATH=app python -m jira_worker [--once]."""
import argparse
import asyncio
import logging
from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select, or_, update
from core.database import AsyncSessionLocal
from models.jira import JiraBinding, JiraConnection, JiraSyncRun, JiraSyncTask, now
from services.context_access import authorize_projects
from services.jira.client import JiraClient, JiraError, access_token
from services.jira.sync import queue_run, fetch_batch, persist_batch, finish_run

logger = logging.getLogger("huzlr.jira")


async def schedule():
    async with AsyncSessionLocal() as db, db.begin():
        bindings = (await db.scalars(select(JiraBinding).join(JiraConnection)
            .where(JiraBinding.status == "active", JiraConnection.status == "connected", JiraBinding.next_sync_at <= now())
            .order_by(JiraBinding.next_sync_at).limit(20).with_for_update(of=JiraBinding, skip_locked=True))).all()
        for binding in bindings:
            await queue_run(db, binding)


async def claim_task():
    async with AsyncSessionLocal() as db, db.begin():
        task = await db.scalar(select(JiraSyncTask).join(JiraSyncRun).join(JiraBinding)
            .where(JiraBinding.status == "active", JiraSyncRun.status.in_(["queued", "running"]),
                JiraSyncTask.status.in_(["queued", "running"]), JiraSyncTask.available_at <= now(),
                or_(JiraSyncTask.lease_until.is_(None), JiraSyncTask.lease_until < now()))
            .order_by(JiraSyncRun.started_at, JiraSyncTask.dataset, JiraSyncTask.id)
            .limit(1).with_for_update(of=JiraSyncTask, skip_locked=True))
        if not task:
            return None
        task.lease_token, task.lease_until, task.status = str(uuid4()), now() + timedelta(seconds=90), "running"
        task.attempts += 1
        return {"id": task.id, "token": task.lease_token}


async def heartbeat(claim):
    while True:
        await asyncio.sleep(20)
        async with AsyncSessionLocal() as db, db.begin():
            await db.execute(update(JiraSyncTask).where(JiraSyncTask.id == claim["id"],
                JiraSyncTask.lease_token == claim["token"]).values(lease_until=now() + timedelta(seconds=90)))


async def process(claim):
    heart = asyncio.create_task(heartbeat(claim))
    try:
        async with asyncio.timeout(300), AsyncSessionLocal() as db:
            task = await db.get(JiraSyncTask, claim["id"])
            if not task:
                return
            run = await db.get(JiraSyncRun, task.run_id)
            binding = await db.get(JiraBinding, run.binding_id)
            if not binding or binding.status != "active":
                return
            await authorize_projects(db, binding.user_id, binding.workspace_id, [binding.project_id])
            token = await access_token(db, binding.connection_id)
            # Refresh completed task/run data are immutable copies; source writes happen only after fencing.
            task_data = SimpleNamespace(dataset=task.dataset, target_id=task.target_id, cursor=task.cursor)
            async with JiraClient(token, binding.cloud_id) as client:
                try:
                    values, next_cursor = await fetch_batch(client, binding, run, task_data)
                except JiraError as exc:
                    if exc.status != 401:
                        raise
                    token = await access_token(db, binding.connection_id, force=True, rejected_token=token)
                    client.token = token
                    values, next_cursor = await fetch_batch(client, binding, run, task_data)
            binding_id = binding.id
            await db.rollback()
            # Same lock order as queue/disconnect. Recheck fencing after provider I/O.
            binding = await db.scalar(select(JiraBinding).where(JiraBinding.id == binding_id).with_for_update())
            task = await db.scalar(select(JiraSyncTask).where(JiraSyncTask.id == claim["id"]).with_for_update().execution_options(populate_existing=True))
            if not binding or not task or task.lease_token != claim["token"] or binding.status != "active":
                return
            await authorize_projects(db, binding.user_id, binding.workspace_id, [binding.project_id])
            run = await db.get(JiraSyncRun, task.run_id)
            await persist_batch(db, binding, run, task, values, next_cursor)
            await finish_run(db, binding, run)
            await db.commit()
    except (JiraError, HTTPException) as exc:
        await fail(claim, exc.category if isinstance(exc, JiraError) else "destination_access_revoked",
            getattr(exc, "retry_after", 0), getattr(exc, "status", 403))
    except Exception as exc:
        logger.error("Jira task failed task=%s error=%s", claim["id"], type(exc).__name__)
        await fail(claim, type(exc).__name__, 0, 503)
    finally:
        heart.cancel()
        await asyncio.gather(heart, return_exceptions=True)


async def fail(claim, category, delay, status):
    async with AsyncSessionLocal() as db, db.begin():
        run_id = await db.scalar(select(JiraSyncTask.run_id).where(JiraSyncTask.id == claim["id"]))
        if not run_id:
            return
        run = await db.get(JiraSyncRun, run_id)
        binding = await db.scalar(select(JiraBinding).where(JiraBinding.id == run.binding_id).with_for_update())
        task = await db.scalar(select(JiraSyncTask).where(JiraSyncTask.id == claim["id"]).with_for_update())
        if not binding or not task or task.lease_token != claim["token"]:
            return
        task.error, task.lease_token, task.lease_until = category[:120], None, None
        task.status = "unavailable" if status in {400, 401, 403, 404} else "failed" if task.attempts >= 5 else "queued"
        # A provider cursor may expire; restart enumeration safely with idempotent storage.
        if category == "invalid_request" and task.cursor and task.attempts < 3:
            task.cursor, task.status = {}, "queued"
        task.available_at = now() + timedelta(seconds=max(delay, min(300, 2 ** task.attempts * 5)))
        run.error = category[:120]
        await finish_run(db, binding, run)


async def main(once=False):
    from services.jira.webhooks import maintain
    while True:
        await maintain(AsyncSessionLocal)
        await schedule()
        claim = await claim_task()
        if claim:
            await process(claim)
        elif once:
            return
        else:
            await asyncio.sleep(5)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="Drain currently available tasks")
    asyncio.run(main(parser.parse_args().once))
