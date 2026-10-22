from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.db.models import F
from rest_framework.exceptions import ValidationError


def article_vector():
    return SearchVector("title", config="english", weight="A") + SearchVector(
        "summary", config="english", weight="B"
    )


def search_articles(queryset, text):
    text = text.strip()
    if len(text) > 200 or "\x00" in text:
        raise ValidationError({"q": "Use at most 200 characters without null characters."})
    if not text:
        return queryset
    query = SearchQuery(text, config="english", search_type="plain")
    return (
        queryset.annotate(search_document=article_vector())
        .filter(search_document=query)
        .annotate(search_rank=SearchRank(article_vector(), query))
        .order_by("-search_rank", F("published_at").desc(nulls_last=True), "-id")
    )
