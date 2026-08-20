import tempfile
import unittest
from pathlib import Path

from worker_settings import WorkerSettings


class WorkerSettingsTests(unittest.TestCase):
    def environment(self, profile_dir: str, storage_state_path: str = ""):
        return {
            "HUZLR_BACKEND_URL": "http://localhost:8001/",
            "HUZL_WORKER_KEY": "test-worker-key",
            "BOT_PROFILE_DIR": profile_dir,
            "BOT_STORAGE_STATE_PATH": storage_state_path,
            "REQUIRE_BOT_PROFILE": "true",
        }

    def test_loads_valid_settings(self):
        with tempfile.TemporaryDirectory() as profile_dir:
            state_path = Path(profile_dir) / "auth-state.json"
            state_path.write_text("{}")
            settings = WorkerSettings.from_environment(self.environment(profile_dir, str(state_path)))

        self.assertEqual(settings.backend_url, "http://localhost:8001")
        self.assertEqual(settings.worker_key, "test-worker-key")

    def test_rejects_missing_worker_key(self):
        with tempfile.TemporaryDirectory() as profile_dir:
            environment = self.environment(profile_dir)
            environment["HUZL_WORKER_KEY"] = ""
            with self.assertRaisesRegex(RuntimeError, "HUZL_WORKER_KEY"):
                WorkerSettings.from_environment(environment)

    def test_rejects_invalid_backend_url(self):
        with tempfile.TemporaryDirectory() as profile_dir:
            environment = self.environment(profile_dir)
            environment["HUZLR_BACKEND_URL"] = "localhost:8001"
            with self.assertRaisesRegex(RuntimeError, "absolute http"):
                WorkerSettings.from_environment(environment)

    def test_rejects_missing_required_profile(self):
        missing_profile = str(Path(tempfile.gettempdir()) / "missing-huzl-profile")
        environment = self.environment(missing_profile)
        with self.assertRaisesRegex(RuntimeError, "does not exist"):
            WorkerSettings.from_environment(environment)

    def test_rejects_missing_authentication_state(self):
        with tempfile.TemporaryDirectory() as profile_dir:
            missing_state = str(Path(profile_dir) / "auth-state.json")
            environment = self.environment(profile_dir, missing_state)
            with self.assertRaisesRegex(RuntimeError, "BOT_STORAGE_STATE_PATH does not exist"):
                WorkerSettings.from_environment(environment)


if __name__ == "__main__":
    unittest.main()
