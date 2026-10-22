bind = "0.0.0.0:8000"
workers = 2
timeout = 45
accesslog = "-"
errorlog = "-"
# Exclude query strings, request headers, cookies and bodies.
access_log_format = "%(m)s %(U)s %(s)s %(L)s"
