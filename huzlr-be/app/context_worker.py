"""Run separately: PYTHONPATH=app python -m context_worker [--once | --reconcile]."""
import argparse
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select, or_, update, text
from core.config import settings
from core.database import AsyncSessionLocal
from models.context import ContextJob
from services.context_access import enabled
from services.context_graph import graph_driver, initialize, replace_projection, apply_embeddings
from services.context_snapshot import snapshot
from services.context_enrichment import enrich

logger = logging.getLogger("huzlr.context")


async def claim_job():
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db, db.begin():
        query = select(ContextJob).where(ContextJob.revision > ContextJob.applied_revision,
            ContextJob.attempts < 5, ContextJob.available_at <= now,
            or_(ContextJob.lease_until.is_(None), ContextJob.lease_until < now))
        job = await db.scalar(query.order_by(ContextJob.available_at, ContextJob.project_id).limit(1).with_for_update(skip_locked=True))
        phase = "graph"
        if not job:
            phase = "enrichment"
            job = await db.scalar(select(ContextJob).where(
                ContextJob.revision == ContextJob.applied_revision,
                ContextJob.applied_revision > ContextJob.enrichment_revision,
                ContextJob.enrichment_attempts < 5, ContextJob.enrichment_available_at <= now,
                or_(ContextJob.lease_until.is_(None), ContextJob.lease_until < now))
                .order_by(ContextJob.enrichment_available_at, ContextJob.project_id).limit(1).with_for_update(skip_locked=True))
            if not job:
                return None
        job.lease_token = str(uuid4())
        job.lease_until = now + timedelta(seconds=90)
        if phase == "graph":
            job.attempts += 1
        else:
            job.enrichment_attempts += 1
        return {"project_id": job.project_id, "workspace_id": job.workspace_id, "revision": job.revision,
                "token": job.lease_token, "phase": phase,
                "attempts": job.attempts if phase == "graph" else job.enrichment_attempts}


async def heartbeat(job):
    while True:
        await asyncio.sleep(20)
        async with AsyncSessionLocal() as db, db.begin():
            await db.execute(update(ContextJob).where(ContextJob.project_id == job["project_id"],
                ContextJob.lease_token == job["token"]).values(lease_until=datetime.now(timezone.utc) + timedelta(seconds=90)))


async def process(driver, job):
    heart = asyncio.create_task(heartbeat(job))
    error = None
    try:
        async with asyncio.timeout(600):
            async with AsyncSessionLocal() as db:
                nodes, edges, artifacts = await snapshot(db, job["project_id"], job["workspace_id"])
                if job.get("phase", "graph") == "graph":
                    await replace_projection(driver, job["project_id"], job["workspace_id"], job["revision"], nodes, edges)
                else:
                    await enrich(db, job["project_id"], nodes, artifacts)
                    await db.commit()
                    await apply_embeddings(driver, job["project_id"], job["workspace_id"], nodes)
    except Exception as exc:
        # Do not store provider error bodies or source text in the public status response.
        error = type(exc).__name__
        logger.error("context processing failed project=%s error=%s", job["project_id"], error)
    finally:
        heart.cancel()
        await asyncio.gather(heart, return_exceptions=True)
    async with AsyncSessionLocal() as db, db.begin():
        stamp = datetime.now(timezone.utc)
        values = {"lease_token": None, "lease_until": None}
        if job.get("phase", "graph") == "enrichment":
            values["enrichment_error"] = error
            if error:
                values["enrichment_available_at"] = stamp + timedelta(seconds=min(300, 2 ** job["attempts"] * 5))
            else:
                values.update(enrichment_revision=job["revision"], enrichment_attempts=0)
        else:
            values["error"] = error
            if error:
                values["available_at"] = stamp + timedelta(seconds=min(300, 2 ** job["attempts"] * 5))
            else:
                values.update(applied_revision=job["revision"], attempts=0, indexed_at=stamp,
                    enrichment_attempts=0, enrichment_available_at=stamp, enrichment_error=None)
        await db.execute(update(ContextJob).where(ContextJob.project_id == job["project_id"], ContextJob.lease_token == job["token"]).values(**values))


async def reconcile():
    async with AsyncSessionLocal() as db, db.begin():
        await db.execute(text("""INSERT INTO context_jobs(project_id, workspace_id)
            SELECT p.project_id, t.workspace_id FROM projects p JOIN teams t ON t.id = p.team_id
            ON CONFLICT (project_id) DO UPDATE SET revision = context_jobs.revision + 1,
                workspace_id = EXCLUDED.workspace_id, available_at = now(), attempts = 0, error = NULL"""))
        # Includes deleted projects whose original deletion event was missed.
        await db.execute(text("""UPDATE context_jobs SET revision = revision + 1, attempts = 0, available_at = now()
            WHERE project_id NOT IN (SELECT project_id FROM projects)"""))


async def run(once=False, repair=False):
    if not settings.CONTEXT_ENABLED:
        raise RuntimeError("Set CONTEXT_ENABLED=true to start the context worker")
    if repair:
        await reconcile()
    async with graph_driver() as driver:
        await initialize(driver)
        while True:
            job = await claim_job()
            if job:
                await process(driver, job)
            elif once:
                return
            else:
                await asyncio.sleep(2)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="Drain available jobs and exit")
    parser.add_argument("--reconcile", action="store_true", help="Queue reconciliation before consuming jobs")
    args = parser.parse_args()
    asyncio.run(run(args.once, args.reconcile))
