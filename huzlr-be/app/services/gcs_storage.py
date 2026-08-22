import asyncio
from functools import cached_property

from core.config import settings


class GCSStorageError(RuntimeError):
    """Raised when a configured Cloud Storage operation cannot complete."""


class GCSObjectNotFound(GCSStorageError):
    """Raised when a referenced Cloud Storage object does not exist."""


class GCSStorage:
    @property
    def enabled(self) -> bool:
        return bool(settings.GCS_BUCKET_NAME.strip())

    @cached_property
    def client(self):
        if not self.enabled:
            raise GCSStorageError("GCS_BUCKET_NAME is not configured")

        try:
            from google.cloud import storage

            return storage.Client(project=settings.GCS_PROJECT_ID or None)
        except ImportError as error:
            raise GCSStorageError("google-cloud-storage is not installed") from error
        except Exception as error:
            raise GCSStorageError("Google Cloud credentials could not be initialized") from error

    @cached_property
    def bucket(self):
        return self.client.bucket(settings.GCS_BUCKET_NAME)

    def document_object_name(self, project_id: int, document_id: int) -> str:
        prefix = settings.GCS_DOCUMENTS_PREFIX.strip("/") or "project-documents"
        return f"{prefix}/{project_id}/{document_id}.html"

    async def upload_text(self, object_name: str, content: str) -> None:
        encoded_content = content.encode("utf-8")
        if len(encoded_content) > settings.GCS_MAX_DOCUMENT_BYTES:
            raise GCSStorageError(
                f"Document exceeds the {settings.GCS_MAX_DOCUMENT_BYTES}-byte storage limit"
            )

        def upload() -> None:
            blob = self.bucket.blob(object_name)
            blob.upload_from_string(
                encoded_content,
                content_type="text/html; charset=utf-8",
                checksum="auto",
            )

        try:
            await asyncio.to_thread(upload)
        except GCSStorageError:
            raise
        except Exception as error:
            raise GCSStorageError(f"Could not upload gs://{settings.GCS_BUCKET_NAME}/{object_name}") from error

    async def download_text(self, object_name: str) -> str:
        def download() -> bytes:
            return self.bucket.blob(object_name).download_as_bytes(checksum="auto")

        try:
            content = await asyncio.to_thread(download)
            return content.decode("utf-8")
        except Exception as error:
            try:
                from google.api_core.exceptions import NotFound

                if isinstance(error, NotFound):
                    raise GCSObjectNotFound(
                        f"gs://{settings.GCS_BUCKET_NAME}/{object_name} does not exist"
                    ) from error
            except ImportError:
                pass

            raise GCSStorageError(f"Could not download gs://{settings.GCS_BUCKET_NAME}/{object_name}") from error

    async def delete(self, object_name: str) -> None:
        def delete_blob() -> None:
            self.bucket.blob(object_name).delete()

        try:
            await asyncio.to_thread(delete_blob)
        except Exception as error:
            try:
                from google.api_core.exceptions import NotFound

                if isinstance(error, NotFound):
                    return
            except ImportError:
                pass

            raise GCSStorageError(f"Could not delete gs://{settings.GCS_BUCKET_NAME}/{object_name}") from error


gcs_storage = GCSStorage()
