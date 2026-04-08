from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.api.api import api_router
from app.core.config import settings
from app.core.exceptions import (
    general_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.db.init_db import init_db

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# CORS設定を最初に追加
origins = [
    "http://localhost:3000",
    "http://frontend:3000",
    "https://research-tmp.vercel.app"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)


@app.on_event("startup")
def on_startup() -> None:
    try:
        logger.info("🚀 Starting database initialization...")
        init_db()
        logger.info("✓ Database initialization completed")
    except Exception as e:
        logger.error(f"✗ Database initialization failed: {e}")
        # アプリケーションは継続して起動するが、ログに記録
        # 本番環境ではここで raise して起動を中止することも検討

# ルーターを含める
app.include_router(api_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to FastAPI backend"}