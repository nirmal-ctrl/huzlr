"""Long-running cloud AI Worker queue consumer."""

import asyncio
import logging
import os
import socket
from uuid import uuid4

from core.config import settings
from core.database import AsyncSessionLocal
from services.ai_worker_runtime import claim_cloud_execution, run_execution


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("huzlr.ai_worker")


async def run_forever() -> None:
    runner_id = f"{socket.gethostname()}:{os.getpid()}:{uuid4().hex[:8]}"
    logger.info("AI Worker runner started as %s", runner_id)
    while True:
        try:
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
