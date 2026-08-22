import asyncio
from functools import cached_property

from google.auth import exceptions as google_auth_exceptions
from google.auth import identity_pool

from core.config import settings
from core.vercel_oidc import get_vercel_oidc_token


GOOGLE_CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform"
OIDC_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:jwt"


class GCSStorageError(RuntimeError):
    """Raised when a configured Cloud Storage operation cannot complete."""


class GCSObjectNotFound(GCSStorageError):
    """Raised when a referenced Cloud Storage object does not exist."""


class VercelSubjectTokenSupplier(identity_pool.SubjectTokenSupplier):
    """Supply the OIDC token attached to the active Vercel request."""

    def get_subject_token(self, context, request) -> str:
        token = get_vercel_oidc_token()
        if not token:
            raise google_auth_exceptions.RefreshError(
                "Vercel OIDC token is unavailable for this request"
            )
        return token


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

            project_id = settings.GCS_PROJECT_ID or settings.GCP_PROJECT_ID or None
            credentials = self._vercel_credentials()
            return storage.Client(project=project_id, credentials=credentials)
        except ImportError as error:
            raise GCSStorageError("google-cloud-storage is not installed") from error
        except GCSStorageError:
            raise
        except Exception as error:
            raise GCSStorageError("Google Cloud credentials could not be initialized") from error

    def _vercel_credentials(self):
        config = {
            "GCP_PROJECT_NUMBER": settings.GCP_PROJECT_NUMBER.strip(),
            "GCP_SERVICE_ACCOUNT_EMAIL": settings.GCP_SERVICE_ACCOUNT_EMAIL.strip(),
            "GCP_WORKLOAD_IDENTITY_POOL_ID": settings.GCP_WORKLOAD_IDENTITY_POOL_ID.strip(),
            "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID": (
                settings.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID.strip()
            ),
        }
        configured_values = [value for value in config.values() if value]

        if not configured_values:
            return None

        missing = [name for name, value in config.items() if not value]
        if missing:
            raise GCSStorageError(
                "Incomplete Google Workload Identity configuration; missing "
                + ", ".join(missing)
            )

        audience = (
            f"//iam.googleapis.com/projects/{config['GCP_PROJECT_NUMBER']}"
            "/locations/global/workloadIdentityPools/"
            f"{config['GCP_WORKLOAD_IDENTITY_POOL_ID']}/providers/"
            f"{config['GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID']}"
        )
        impersonation_url = (
            "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/"
            f"{config['GCP_SERVICE_ACCOUNT_EMAIL']}:generateAccessToken"
        )

        return identity_pool.Credentials(
            audience=audience,
            subject_token_type=OIDC_TOKEN_TYPE,
            subject_token_supplier=VercelSubjectTokenSupplier(),
            service_account_impersonation_url=impersonation_url,
            scopes=[GOOGLE_CLOUD_PLATFORM_SCOPE],
        )

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
