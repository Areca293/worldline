"""Public-domain passages checked against linked editions on 2026-10-23.

Dates select a curated rotation, not a new publication or generated quotation.
Fiction identifies its speaker. Wording and punctuation are retained.
"""

from datetime import date

WALDEN = {
    "author": "Henry David Thoreau",
    "work": "Walden (1854)",
    "source_url": "https://www.gutenberg.org/files/205/205-h/205-h.htm",
    "speaker": "",
}
ALICE = {
    "author": "Lewis Carroll",
    "work": "Alice’s Adventures in Wonderland (1865)",
    "source_url": "https://www.gutenberg.org/files/11/11-h/11-h.htm",
    "speaker": "Alice",
}
QUOTES = (
    {**WALDEN, "text": "Only that day dawns to which we are awake.", "locator": "Conclusion"},
    {**ALICE, "text": "Curiouser and curiouser!", "locator": "Chapter II, The Pool of Tears"},
    {
        **WALDEN,
        "text": "Rather than love, than money, than fame, give me truth.",
        "locator": "Conclusion",
    },
    {
        **ALICE,
        "text": "Who in the world am I? Ah, that’s the great puzzle!",
        "locator": "Chapter II, The Pool of Tears",
    },
    {
        **WALDEN,
        "text": "Books are the treasured wealth of the world and the fit inheritance of generations and nations.",
        "locator": "Reading",
    },
)


def quotation_for(day):
    return {**QUOTES[(day - date(2026, 10, 23)).days % len(QUOTES)], "date": day.isoformat()}
