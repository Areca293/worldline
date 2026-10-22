import re

from django.contrib.postgres.search import (
    SearchQuery,
    SearchRank,
    SearchVector,
    TrigramStrictWordSimilarity,
)
from django.db.models import F, Q, TextField, Value
from django.db.models.functions import Concat
from rest_framework.exceptions import ValidationError


def article_vector():
    return SearchVector("title", config="english", weight="A") + SearchVector(
        "summary", config="english", weight="B"
    )


def search_articles(queryset, text):
    """Exact search first; conservative spelling fallback within the same scoped rows."""
    text = text.strip()
    if len(text) > 200 or "\x00" in text:
        raise ValidationError({"q": "Use at most 200 characters without null characters."})
    if not text:
        return queryset, False
    query = SearchQuery(text, config="english", search_type="plain")
    exact = (
        queryset.annotate(search_document=article_vector())
        .filter(
            Q(search_document=query)
            | Q(source__name__icontains=text)
            | Q(repository__full_name__icontains=text)
        )
        .annotate(search_rank=SearchRank(article_vector(), query))
        .order_by("-search_rank", F("published_at").desc(nulls_last=True), "-id")
    )
    if exact.exists():
        return exact, False
    # No expansion for very short/long queries, URLs or non-English text. Every
    # word must resemble a full stored word; do not silently drop query terms.
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    if not 1 <= len(tokens) <= 8 or any(len(t) < 4 or len(t) > 40 for t in tokens):
        return exact, False
    if not re.fullmatch(r"[a-zA-Z0-9\s-]+", text):
        return exact, False
    document = Concat(
        "title", Value(" "), "summary", Value(" "), "source__name", output_field=TextField()
    )
    approximate = queryset
    rank = Value(0.0)
    for i, token in enumerate(tokens):
        name = f"spelling_{i}"
        approximate = approximate.annotate(
            **{name: TrigramStrictWordSimilarity(token, document)}
        ).filter(**{f"{name}__gte": 0.5})
        rank = rank + F(name)
    return approximate.annotate(search_rank=rank).order_by(
        "-search_rank", F("published_at").desc(nulls_last=True), "-id"
    ), True
