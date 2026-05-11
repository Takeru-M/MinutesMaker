import logging
import sys
from time import perf_counter

from fastapi import Request
from app.core.config import settings


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
    """Setup logging configuration based on environment."""
    # DEBUG環境変数に基づくログレベルの決定
    log_level = logging.DEBUG if settings.debug else logging.INFO
    
    # ログフォーマット
    log_format = "%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s"
    
    # ハンドラの設定
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)
    handler.setFormatter(logging.Formatter(log_format))
    
    # ルートロガーの設定
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.addHandler(handler)
    
    # アプリケーションのロガーにも同じハンドラを追加
    app_logger = logging.getLogger("app")
    app_logger.setLevel(log_level)
    
    # アプリ関連の子ロガーのレベルを設定
    for logger_name in [
        "app.api",
        "app.workers", 
        "app.services",
        "app.services.rag",
        "app.crud",
        "app.request",
    ]:
        logger = logging.getLogger(logger_name)
        logger.setLevel(log_level)

