from django.urls import path

from . import auth, views

urlpatterns = [
    path("health/", views.health),
    path("topics/", views.TopicList.as_view()),
    path("articles/", views.ArticleList.as_view()),
    path("articles/<slug:slug>/", views.ArticleDetail.as_view()),
    path("articles/<slug:slug>/bookmark/", views.BookmarkDetail.as_view()),
    path("bookmarks/", views.BookmarkList.as_view()),
    path("auth/session/", auth.SessionView.as_view()),
    path("auth/login/", auth.LoginView.as_view()),
    path("auth/logout/", auth.LogoutView.as_view()),
]
