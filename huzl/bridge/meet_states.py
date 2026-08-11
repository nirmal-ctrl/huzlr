from typing import Optional


def detect_terminal_meeting_error(body_text: str) -> Optional[tuple[str, str]]:
    states = (
        (
            ("you can't join this video call", "you cannot join this video call"),
            "MEETING_ACCESS_BLOCKED",
            "Google Meet blocked this account; invite the bot account or have the host start the meeting",
        ),
        (
            ("request denied", "request was denied", "request to join was denied"),
            "ADMISSION_REJECTED",
            "The meeting host denied the bot's admission request",
        ),
        (("meeting has ended",), "MEETING_ENDED", "The Google Meet session has ended"),
        (("removed from",), "ADMISSION_REJECTED", "The bot was removed from the Google Meet session"),
    )
    normalized_text = body_text.lower()
    for phrases, code, message in states:
        if any(phrase in normalized_text for phrase in phrases):
            return code, message
    return None
