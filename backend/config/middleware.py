from django.conf import settings


class AdminCookieIsolationMiddleware:
    """Give /admin/ its own cookies while retaining Django's session/CSRF logic.

    Must wrap SessionMiddleware and CsrfViewMiddleware: translate incoming cookie
    names before they run, and outgoing names after they finish. Never change
    global settings, which would mix identities across concurrent requests.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path_info.startswith("/admin/"):
            return self.get_response(request)

        names = {
            settings.SESSION_COOKIE_NAME: "worldline_admin_session",
            settings.CSRF_COOKIE_NAME: "worldline_admin_csrf",
        }
        request.COOKIES = request.COOKIES.copy()
        for reader_name, admin_name in names.items():
            request.COOKIES.pop(reader_name, None)
            if admin_name in request.COOKIES:
                request.COOKIES[reader_name] = request.COOKIES[admin_name]

        response = self.get_response(request)
        for reader_name, admin_name in names.items():
            if reader_name in response.cookies:
                cookie = response.cookies.pop(reader_name)
                response.cookies[admin_name] = cookie.value
                # Preserve expiry/deletion, Secure, HttpOnly, SameSite and domain.
                response.cookies[admin_name].update(cookie)
                response.cookies[admin_name]["path"] = "/admin/"
        return response
