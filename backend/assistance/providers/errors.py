"""Safe provider errors shared with business orchestration."""


class AssistanceError(Exception):
    def __init__(self, code, message, status=503, *, tokens=None):
        self.code, self.message, self.status = code, message, status
        self.tokens = tokens or {}
        super().__init__(code)
