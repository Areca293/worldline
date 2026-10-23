from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from rest_framework.test import APIClient

from assistance.quotes import QUOTES, quotation_for


def test_quote_rotation_is_stable_dated_and_attributed_without_ai_or_database():
    day = datetime(2026, 10, 23, tzinfo=timezone.utc).date()
    for offset in range(len(QUOTES)):
        result = quotation_for(day + timedelta(days=offset))
        assert result["text"] == QUOTES[offset]["text"]
        assert result["source_url"].startswith("https://www.gutenberg.org/files/")
        assert result["author"] and result["work"] and result["locator"]
    assert quotation_for(day)["text"] == quotation_for(day + timedelta(days=len(QUOTES)))["text"]
    with patch(
        "assistance.views.timezone.now",
        return_value=datetime(2026, 10, 23, 23, 59, tzinfo=timezone.utc),
    ):
        first = APIClient().get("/api/quotes/today/")
    with patch(
        "assistance.views.timezone.now",
        return_value=datetime(2026, 10, 24, 0, 0, tzinfo=timezone.utc),
    ):
        second = APIClient().get("/api/quotes/today/")
    assert first.status_code == second.status_code == 200
    assert first.json()["date"] == "2026-10-23" and second.json()["date"] == "2026-10-24"
    assert first.json()["text"] != second.json()["text"]
    assert "no-store" in first["Cache-Control"]
