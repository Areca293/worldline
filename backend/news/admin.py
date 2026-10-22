from django.contrib import admin

from .models import Article, Bookmark, FeedRun, Repository, Source, Topic


@admin.register(Source)
class SourceAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "topic",
        "is_active",
        "last_attempt_at",
        "last_success_at",
        "last_error",
    ]
    readonly_fields = ["last_attempt_at", "last_success_at", "last_error"]
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


@admin.register(FeedRun)
class FeedRunAdmin(admin.ModelAdmin):
    list_display = [
        "source",
        "trigger",
        "attempt",
        "status",
        "started_at",
        "finished_at",
        "created",
        "updated",
        "skipped",
    ]
    list_filter = ["status", "trigger", "source"]
    list_select_related = ["source"]
    readonly_fields = [field.name for field in FeedRun._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Repository)
class RepositoryAdmin(admin.ModelAdmin):
    list_display = ["full_name", "stars", "star_change", "observed_at", "baseline_at"]
    search_fields = ["full_name"]
    readonly_fields = [field.name for field in Repository._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
