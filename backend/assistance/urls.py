from django.urls import path

from . import views

urlpatterns = [
    path("quotes/today/", views.DailyQuoteView.as_view()),
    path("ai/status/", views.StatusView.as_view()),
    path("ai/research/", views.ResearchView.as_view()),
    path("ai/articles/<slug:slug>/", views.ReadingView.as_view()),
]
