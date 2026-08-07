import unittest

from pydantic import ValidationError

from schemas.scrum_master import ScrumMasterSettingsUpdate, WorkerStatusUpdate


class ScrumMasterContractTests(unittest.TestCase):
    def test_safe_policy_defaults(self):
        policy = ScrumMasterSettingsUpdate(bot_name="Huzlr Scrum Master")
        self.assertFalse(policy.auto_join)
        self.assertTrue(policy.join_only_organized)
        self.assertIsNone(policy.bot_account_email)

    def test_policy_rejects_unbounded_duration(self):
        with self.assertRaises(ValidationError):
            ScrumMasterSettingsUpdate(bot_name="Huzlr", max_meeting_minutes=300)

    def test_worker_error_message_is_bounded(self):
        with self.assertRaises(ValidationError):
            WorkerStatusUpdate(status="failed", error_message="x" * 1001)


if __name__ == "__main__":
    unittest.main()

