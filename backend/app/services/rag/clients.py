from functools import lru_cache

from openai import OpenAI
from qdrant_client import QdrantClient

from app.core.config import settings


@lru_cache(maxsize=1)
def get_openai_client() -> OpenAI:
    return OpenAI(api_key=settings.openai_api_key)


@lru_cache(maxsize=1)
def get_qdrant_client() -> QdrantClient:
    kwargs: dict[str, str] = {"url": settings.qdrant_url}
    if settings.qdrant_api_key:
        kwargs["api_key"] = settings.qdrant_api_key
    return QdrantClient(**kwargs)


def get_collection_name() -> str:
    return f"{settings.qdrant_collection_prefix}_meeting_knowledge"
