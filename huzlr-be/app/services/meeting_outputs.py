import json
import logging
import re

from google import genai
from sqlalchemy import select

from core.config import settings
from core.database import AsyncSessionLocal
from models.scrum_master import MeetingTranscriptSegment, ScrumMeeting


logger = logging.getLogger("huzlr.meeting_outputs")


async def finalize_meeting_outputs(meeting_id: int):
    if not settings.GEMINI_API_KEY:
        logger.warning("Skipping meeting outputs: GEMINI_API_KEY is not configured")
        return

    async with AsyncSessionLocal() as db:
        meeting = await db.get(ScrumMeeting, meeting_id)
        if not meeting:
            return
        requested = meeting.outputs.get("requested", {}) if meeting.outputs else {}
        if not any(requested.values()):
            return
        result = await db.execute(
            select(MeetingTranscriptSegment)
            .where(MeetingTranscriptSegment.meeting_id == meeting_id)
            .order_by(MeetingTranscriptSegment.created_at.asc())
        )
        segments = result.scalars().all()
        transcript = "\n".join(f"{segment.speaker_type}: {segment.text}" for segment in segments)
        if not transcript.strip():
            return

    prompt = f"""
Analyze this Scrum meeting transcript. Return only valid JSON with this shape:
{{
  "summary": "concise meeting summary",
  "decisions": ["decision"],
  "action_items": [{{"title": "action", "owner": null, "due_date": null}}],
  "blockers": ["blocker"]
}}
Do not invent owners, dates, decisions, or blockers. Use null when an owner or due date
was not explicitly stated. Transcript:

{transcript[:100000]}
"""
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", response.text.strip())
        generated = json.loads(cleaned)
        outputs = {
            "requested": requested,
            "summary": generated.get("summary") if requested.get("summary") else None,
            "decisions": generated.get("decisions", []),
            "action_items": generated.get("action_items", []) if requested.get("action_items") else [],
            "blockers": generated.get("blockers", []),
        }
    except Exception:
        logger.exception("Meeting output generation failed for meeting %s", meeting_id)
        return
    finally:
        await client.aio.aclose()

    async with AsyncSessionLocal() as db:
        meeting = await db.get(ScrumMeeting, meeting_id)
        if meeting:
            meeting.outputs = outputs
            await db.commit()
