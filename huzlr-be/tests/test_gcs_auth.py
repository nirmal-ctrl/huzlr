import asyncio
import os
import unittest
from contextlib import ExitStack
from unittest.mock import patch

from google.auth import exceptions as google_auth_exceptions
from google.auth import identity_pool

from core.vercel_oidc import (
    VercelOIDCTokenMiddleware,
    bind_vercel_oidc_token,
    get_vercel_oidc_token,
    reset_vercel_oidc_token,
)
from services.gcs_storage import GCSStorage, GCSStorageError, VercelSubjectTokenSupplier


class VercelOIDCTokenTests(unittest.TestCase):
    def test_request_token_takes_precedence_over_environment(self):
        with patch.dict(os.environ, {"VERCEL_OIDC_TOKEN": "environment-token"}):
            context_token = bind_vercel_oidc_token("request-token")
            try:
                self.assertEqual(get_vercel_oidc_token(), "request-token")
            finally:
                reset_vercel_oidc_token(context_token)

            self.assertEqual(get_vercel_oidc_token(), "environment-token")

    def test_supplier_rejects_a_missing_token(self):
        supplier = VercelSubjectTokenSupplier()
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("VERCEL_OIDC_TOKEN", None)
            with self.assertRaises(google_auth_exceptions.RefreshError):
                supplier.get_subject_token(None, None)

    def test_middleware_binds_and_resets_request_header(self):
        observed_tokens = []

        async def downstream(scope, receive, send):
            observed_tokens.append(get_vercel_oidc_token())

        async def receive():
            return {"type": "http.disconnect"}

        async def send(message):
            return None

        scope = {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": [(b"x-vercel-oidc-token", b"request-token")],
        }

        asyncio.run(VercelOIDCTokenMiddleware(downstream)(scope, receive, send))

        self.assertEqual(observed_tokens, ["request-token"])
        self.assertIsNone(get_vercel_oidc_token())


class GCSWorkloadIdentityTests(unittest.TestCase):
    def workload_identity_settings(self):
        return {
            "GCP_PROJECT_NUMBER": "211544679246",
            "GCP_SERVICE_ACCOUNT_EMAIL": (
                "huzlr-vercel-storage@huzlr-478516.iam.gserviceaccount.com"
            ),
            "GCP_WORKLOAD_IDENTITY_POOL_ID": "vercel",
            "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID": "vercel",
        }

    def test_builds_external_credentials_without_a_service_account_key(self):
        with ExitStack() as stack:
            for name, value in self.workload_identity_settings().items():
                stack.enter_context(patch(f"services.gcs_storage.settings.{name}", value))
            credentials = GCSStorage()._vercel_credentials()

        self.assertIsInstance(credentials, identity_pool.Credentials)
        self.assertEqual(
            credentials._audience,
            "//iam.googleapis.com/projects/211544679246/locations/global/"
            "workloadIdentityPools/vercel/providers/vercel",
        )
        self.assertEqual(
            credentials._service_account_impersonation_url,
            "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/"
            "huzlr-vercel-storage@huzlr-478516.iam.gserviceaccount.com:generateAccessToken",
        )

    def test_uses_adc_when_workload_identity_is_not_configured(self):
        with ExitStack() as stack:
            for name in self.workload_identity_settings():
                stack.enter_context(patch(f"services.gcs_storage.settings.{name}", ""))
            self.assertIsNone(GCSStorage()._vercel_credentials())

    def test_rejects_partial_workload_identity_configuration(self):
        with ExitStack() as stack:
            for name in self.workload_identity_settings():
                value = "211544679246" if name == "GCP_PROJECT_NUMBER" else ""
                stack.enter_context(patch(f"services.gcs_storage.settings.{name}", value))
            with self.assertRaisesRegex(GCSStorageError, "Incomplete Google Workload"):
                GCSStorage()._vercel_credentials()

    def test_normalizes_storage_identifiers_from_environment(self):
        storage = GCSStorage()
        with patch(
            "services.gcs_storage.settings.GCS_BUCKET_NAME",
            "  huzlr-project-documents\n",
        ), patch(
            "services.gcs_storage.settings.GCS_DOCUMENTS_PREFIX",
            " /project-documents/\n",
        ):
            self.assertEqual(storage.bucket_name, "huzlr-project-documents")
            self.assertEqual(
                storage.document_object_name(15, 7),
                "project-documents/15/7.html",
            )


if __name__ == "__main__":
    unittest.main()
