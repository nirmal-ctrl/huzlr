import unittest

from worker_contract import MeetingJob


class MeetingJobTests(unittest.TestCase):
    def payload(self):
        return {
            "job_id": "3bc5eb85-8ac7-4d8a-b7c2-4b35dc3fdbdd",
            "meeting_id": 12,
            "workspace_id": 8,
            "meet_url": "https://meet.google.com/abc-defg-hij",
            "starts_at": "2026-08-05T10:00:00Z",
            "bot_name": "Huzlr Scrum Master",
            "max_duration_minutes": 45,
            "outputs": {"transcript": True, "summary": False, "action_items": True},
        }

    def test_parses_backend_job(self):
        job = MeetingJob.from_dict(self.payload())
        self.assertEqual(job.meeting_id, 12)
        self.assertEqual(job.max_duration_minutes, 45)
        self.assertTrue(job.transcript_enabled)
        self.assertFalse(job.summary_enabled)

    def test_rejects_missing_required_fields(self):
        payload = self.payload()
        del payload["meet_url"]
        with self.assertRaisesRegex(ValueError, "meet_url"):
            MeetingJob.from_dict(payload)

    def test_rejects_unbounded_duration(self):
        payload = self.payload()
        payload["max_duration_minutes"] = 300
        with self.assertRaisesRegex(ValueError, "between 1 and 240"):
            MeetingJob.from_dict(payload)


if __name__ == "__main__":
    unittest.main()

