import unittest

from bridge.meet_states import detect_terminal_meeting_error


class MeetTerminalStateTests(unittest.TestCase):
    def test_classifies_google_access_block(self):
        error = detect_terminal_meeting_error(
            "You can't join this video call. No one can join a meeting unless invited or admitted by the host."
        )

        self.assertEqual(error[0], "MEETING_ACCESS_BLOCKED")

    def test_classifies_host_denial(self):
        error = detect_terminal_meeting_error("Your request was denied")

        self.assertEqual(error[0], "ADMISSION_REJECTED")

    def test_ignores_normal_green_room(self):
        self.assertIsNone(detect_terminal_meeting_error("Ready to join? Ask to join"))


if __name__ == "__main__":
    unittest.main()
