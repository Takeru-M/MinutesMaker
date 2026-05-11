from __future__ import annotations

from functools import lru_cache

from redis import Redis

from app.core.config import settings


@lru_cache(maxsize=1)
def get_redis() -> Redis:
    # decode_responses keeps keys/values as str for easier JSON handling.
    return Redis.from_url(settings.redis_url, decode_responses=True)
