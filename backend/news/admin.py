from django.contrib import admin

from .models import Article, Bookmark, Source, Topic


@admin.register(Source)
class SourceAdmin(admin.ModelAdmin):
    list_display = ["name", "topic", "is_active", "feed_url"]
    list_filter = ["is_active", "topic"]
    search_fields = ["name"]


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ["title", "topic", "source", "is_sample", "published_at", "collected_at"]
    list_filter = ["topic", "source", "is_sample"]
    search_fields = ["title", "original_url", "source_entry_id"]
    readonly_fields = ["slug", "collected_at", "source_entry_hash"]
    list_select_related = ["topic", "source"]


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    list_display = ["user", "article", "created_at"]
    readonly_fields = ["created_at"]
    list_select_related = ["user", "article"]
    autocomplete_fields = ["user", "article"]


admin.site.register(Topic)
