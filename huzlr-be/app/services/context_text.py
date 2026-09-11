import hashlib
import json
import re
from html.parser import HTMLParser


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style"}:
            self.hidden += 1
        elif tag in {"p", "div", "br", "li", "h1", "h2", "h3"}:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in {"script", "style"}:
            self.hidden = max(0, self.hidden - 1)
        elif tag in {"p", "div", "li"}:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def plain(value) -> str:
    if not isinstance(value, str):
        value = json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)
    parser = PlainText()
    parser.feed(value)
    return re.sub(r"[ \t]+", " ", "".join(parser.parts)).strip()


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def chunks(text: str, size=1800, overlap=200):
    if size <= overlap or overlap < 0:
        raise ValueError("Invalid chunk sizes")
    for start in range(0, len(text), size - overlap):
        end = min(start + size, len(text))
        yield {"text": text[start:end], "start": start, "end": end}
        if end == len(text):
            break
