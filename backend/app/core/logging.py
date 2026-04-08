import logging
from time import perf_counter

from fastapi import Request


class LoggingMiddleware:
    def __init__(self, app):
        self.app = app
        self.logger = logging.getLogger("app.request")

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive=receive)
        start = perf_counter()
        await self.app(scope, receive, send)
        elapsed_ms = (perf_counter() - start) * 1000
        self.logger.info("%s %s %.2fms", request.method, request.url.path, elapsed_ms)


def setup_loggers() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
