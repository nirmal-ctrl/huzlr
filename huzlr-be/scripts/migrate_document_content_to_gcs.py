"""Move existing database-backed project document bodies into Google Cloud Storage."""

import asyncio
import os
import sys

from sqlalchemy import select


sys.path.append(os.path.join(os.getcwd(), "app"))

from core.database import AsyncSessionLocal
from models.project_document import ProjectDocument
from services.gcs_storage import GCSStorageError, gcs_storage


async def migrate() -> None:
    if not gcs_storage.enabled:
        raise RuntimeError("Set GCS_BUCKET_NAME before running this migration")

    migrated = 0
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(ProjectDocument)
            .where(ProjectDocument.content_object_name.is_(None))
            .where(ProjectDocument.content.is_not(None))
            .order_by(ProjectDocument.document_id)
        )

        for document in result.scalars():
            object_name = gcs_storage.document_object_name(
                document.project_id,
                document.document_id,
            )
            try:
                await gcs_storage.upload_text(object_name, document.content or "")
            except GCSStorageError:
                await session.rollback()
                raise

            document.content_object_name = object_name
            document.content = None
            await session.commit()
            migrated += 1
            print(f"Migrated document {document.document_id} to gs://{gcs_storage.bucket.name}/{object_name}")

    print(f"Migrated {migrated} document(s)")


if __name__ == "__main__":
    asyncio.run(migrate())
