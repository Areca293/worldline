from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination


class ReadingPagination(PageNumberPagination):
    """Reader-selected page sizes, including an explicit single-page All mode."""

    def get_page_size(self, request):
        value = request.query_params.get("page_size", "20")
        self.show_all = value == "all"
        if self.show_all:
            return 1  # Replaced by the filtered count in paginate_queryset.
        if not value.isascii() or not value.isdigit() or len(value) > 9 or int(value) < 1:
            raise ValidationError({"page_size": "Use a positive whole number or all."})
        return int(value)

    def paginate_queryset(self, queryset, request, view=None):
        size = self.get_page_size(request)
        self.request = request
        paginator = self.django_paginator_class(
            queryset, max(1, queryset.count()) if self.show_all else size
        )
        requested = request.query_params.get(self.page_query_param, "1")
        if not requested.isascii() or not requested.isdigit() or len(requested) > 9:
            raise ValidationError({"page": "Use a positive whole number."})
        if int(requested) < 1:
            raise ValidationError({"page": "Use a positive whole number."})
        # A collection can shrink after unsaving its last item. Keep it navigable.
        self.page = paginator.page(1 if self.show_all else min(int(requested), paginator.num_pages))
        return list(self.page)

    def get_paginated_response(self, data):
        response = super().get_paginated_response(data)
        response.data.update(
            {
                "page": self.page.number,
                "page_size": None if self.show_all else self.page.paginator.per_page,
                "total_pages": self.page.paginator.num_pages,
            }
        )
        return response
