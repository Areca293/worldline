"""Shared RSS/GitHub import limits, outcomes and excerpt cleaning.

This HTML-to-excerpt policy also cleans feed image credits. It is intentionally
separate from assistance evidence cleaning and URL validation.
"""

from dataclasses import dataclass
from html.parser import HTMLParser

MAX_FEED_BYTES = 2 * 1024 * 1024


class FeedError(ValueError):
    """Safe, bounded error text suitable for operator output."""


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style"}:
            self.hidden += 1
        elif not self.hidden:
            self.parts.append(" ")

    def handle_endtag(self, tag):
        if tag in {"script", "style"}:
            self.hidden = max(0, self.hidden - 1)
        elif not self.hidden:
            self.parts.append(" ")

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def plain_text(value, limit):
    parser = TextExtractor()
    parser.feed(str(value or ""))
    text = " ".join("".join(parser.parts).split()).replace("\x00", "")
    return text if len(text) <= limit else text[: limit - 1].rsplit(" ", 1)[0] + "…"


@dataclass
class ImportResult:
    created: int = 0
    updated: int = 0
    unchanged: int = 0
    skipped: int = 0
