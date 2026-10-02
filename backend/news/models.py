from django.db import models


class Topic(models.Model):
    name = models.CharField(max_length=80)
    slug = models.SlugField(unique=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name


class Source(models.Model):
    name = models.CharField(max_length=120, unique=True)
    website_url = models.URLField()

    def __str__(self):
        return self.name


class Article(models.Model):
    title = models.CharField(max_length=300)
    slug = models.SlugField(unique=True)
    topic = models.ForeignKey(Topic, on_delete=models.PROTECT)
    source = models.ForeignKey(Source, on_delete=models.PROTECT)
    summary = models.TextField()
    original_url = models.URLField(unique=True)
    published_at = models.DateTimeField(null=True, blank=True)
    collected_at = models.DateTimeField(auto_now_add=True)
    is_sample = models.BooleanField(default=False)
    featured = models.BooleanField(default=False)

    class Meta:
        ordering = ["-featured", "-id"]

    def __str__(self):
        return self.title
