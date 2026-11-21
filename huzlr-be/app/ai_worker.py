"""Long-running cloud AI Worker queue consumer."""

import asyncio
import logging
import os
import socket
import time
from uuid import uuid4

from core.config import settings
from core.database import AsyncSessionLocal
from services.ai_worker_runtime import claim_cloud_execution, run_execution
from services.ai_worker_sandbox import reap_sandboxes


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("huzlr.ai_worker")


async def cleanup_sandboxes() -> bool:
    """Clean managed containers without blocking non-sandbox queue work."""
    try:
        async with AsyncSessionLocal() as db:
            await reap_sandboxes(db)
    except asyncio.CancelledError:
        raise
    except Exception as error:
        logger.warning("Sandbox cleanup skipped: %s", error)
        return False
    return True


async def run_forever() -> None:
    runner_id = f"{socket.gethostname()}:{os.getpid()}:{uuid4().hex[:8]}"
    logger.info("AI Worker runner started as %s", runner_id)
    last_cleanup = 0.0
    cleanup_task: asyncio.Task | None = None
    while True:
        try:
            if settings.AI_WORKER_SANDBOX_ENABLED and time.monotonic() - last_cleanup > 30:
                # Cleanup is best-effort. A stopped Docker daemon must not prevent
                # regular cloud workers from claiming and completing chat turns.
                if cleanup_task is None or cleanup_task.done():
                    cleanup_task = asyncio.create_task(cleanup_sandboxes())
                last_cleanup = time.monotonic()
            async with AsyncSessionLocal() as db:
                execution_id = await claim_cloud_execution(db, runner_id)
            if execution_id:
                async with AsyncSessionLocal() as db:
                    await run_execution(db, execution_id, runner_id)
            else:
                await asyncio.sleep(settings.AI_WORKER_POLL_SECONDS)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("AI Worker runner loop failed")
            await asyncio.sleep(min(5, settings.AI_WORKER_POLL_SECONDS * 2))


if __name__ == "__main__":
    asyncio.run(run_forever())
