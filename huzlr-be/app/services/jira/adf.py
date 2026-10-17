"""ADF-to-text parser preserving readable structure and source-relative offsets."""
import json


def adf_text(value):
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "\n".join(filter(None, (adf_text(v) for v in value)))
    if not isinstance(value, dict):
        return str(value)
    kind, attrs = value.get("type"), value.get("attrs", {})
    if kind == "text":
        text = value.get("text", "")
        links = [m.get("attrs", {}).get("href") for m in value.get("marks", []) if m.get("type") == "link"]
        return text + (f" ({links[0]})" if links and links[0] else "")
    if kind == "mention":
        return attrs.get("text") or f"@{attrs.get('id', 'unknown')}"
    if kind in {"inlineCard", "blockCard"}:
        return attrs.get("url", "")
    if kind == "hardBreak":
        return "\n"
    if kind == "emoji":
        return attrs.get("text") or attrs.get("shortName", "")
    if kind == "status":
        return attrs.get("text", "")
    if kind == "date":
        return str(attrs.get("timestamp", ""))
    content = "".join(adf_text(child) for child in value.get("content", []))
    if kind == "listItem":
        return "- " + content.strip() + "\n"
    if kind in {"tableCell", "tableHeader"}:
        return content.strip() + " | "
    if kind in {"paragraph", "heading", "codeBlock", "blockquote", "tableRow", "bulletList", "orderedList", "table"}:
        return content + "\n"
    if kind:
        return content
    return json.dumps(value, ensure_ascii=False, sort_keys=True)
