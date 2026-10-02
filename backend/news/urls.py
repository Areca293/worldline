from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health),
    path("topics/", views.TopicList.as_view()),
    path("articles/", views.ArticleList.as_view()),
    path("articles/<slug:slug>/", views.ArticleDetail.as_view()),
]
