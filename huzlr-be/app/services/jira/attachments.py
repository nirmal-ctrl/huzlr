"""Bounded UTF-8 evidence; unsupported formats remain visible as coverage gaps."""
import hashlib
from core.config import settings
from services.context_text import plain
from services.jira.client import JiraError

TEXT_TYPES = {"application/json", "application/xml", "application/yaml", "application/x-yaml"}


def supported(metadata):
    mime = str(metadata.get("mimeType", "")).split(";")[0]
    return mime.startswith("text/") or mime in TEXT_TYPES


async def extract_attachment(client, metadata):
    result = {"id": str(metadata["id"]), "metadata": metadata}
    if not settings.JIRA_ATTACHMENT_TEXT_ENABLED:
        return {**result, "coverage": "disabled"}
    if not supported(metadata):
        return {**result, "coverage": "unsupported_format"}
    if int(metadata.get("size", 0)) > settings.JIRA_MAX_ATTACHMENT_BYTES:
        return {**result, "coverage": "oversized"}
    raw = await client.attachment_bytes(metadata["id"])
    try:
        content = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return {**result, "coverage": "unsupported_encoding"}
    if "\x00" in content:
        return {**result, "coverage": "binary_content"}
    if str(metadata.get("mimeType", "")).startswith("text/html"):
        content = plain(content)
    return {**result, "coverage": "complete", "content": content,
        "content_hash": hashlib.sha256(raw).hexdigest()}
