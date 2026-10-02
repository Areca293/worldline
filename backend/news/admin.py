from django.contrib import admin

from .models import Article, Source, Topic


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ["title", "topic", "source", "is_sample", "published_at"]
    list_filter = ["topic", "is_sample"]
    search_fields = ["title"]


admin.site.register([Source, Topic])
