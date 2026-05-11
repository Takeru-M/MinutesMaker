"""
Cache layer for MinutesMaker using Redis.

Provides a cache client with TTL management and common cache operations.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional, TypeVar, Generic

from app.core.config import settings
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CacheClient:
    """Simple cache client wrapper for Redis with TTL support."""

    def __init__(self):
        self.redis = get_redis()

    def get(self, key: str) -> Optional[str]:
        """Get value from cache."""
        try:
            return self.redis.get(key)
        except Exception as e:
            logger.warning(f"Cache get failed for {key}: {e}")
            return None

    def get_json(self, key: str, model_class: type[T] | None = None) -> Optional[T]:
        """Get JSON value from cache and optionally parse as model."""
        try:
            value = self.redis.get(key)
            if value is None:
                return None
            data = json.loads(value)
            if model_class:
                return model_class(**data) if isinstance(data, dict) else data
            return data
        except Exception as e:
            logger.warning(f"Cache get_json failed for {key}: {e}")
            return None

    def set(self, key: str, value: str, ttl: int | None = None) -> bool:
        """Set value in cache with optional TTL (seconds)."""
        try:
            ttl_seconds = ttl or settings.redis_cache_ttl_seconds
            self.redis.setex(key, ttl_seconds, value)
            return True
        except Exception as e:
            logger.warning(f"Cache set failed for {key}: {e}")
            return False

    def set_json(self, key: str, value: Any, ttl: int | None = None) -> bool:
        """Set JSON value in cache with optional TTL (seconds)."""
        try:
            json_str = json.dumps(value) if not isinstance(value, str) else value
            return self.set(key, json_str, ttl)
        except Exception as e:
            logger.warning(f"Cache set_json failed for {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        """Delete value from cache."""
        try:
            self.redis.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Cache delete failed for {key}: {e}")
            return False

    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        try:
            keys = self.redis.keys(pattern)
            if keys:
                return self.redis.delete(*keys)
            return 0
        except Exception as e:
            logger.warning(f"Cache delete_pattern failed for {pattern}: {e}")
            return 0

    def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            return bool(self.redis.exists(key))
        except Exception as e:
            logger.warning(f"Cache exists failed for {key}: {e}")
            return False

    def invalidate_for_meeting(self, meeting_id: int) -> None:
        """Invalidate all caches related to a meeting."""
        patterns = [
            f"meeting:{meeting_id}:*",
            f"qa:meeting:{meeting_id}:*",
        ]
        for pattern in patterns:
            self.delete_pattern(pattern)


def get_cache_client() -> CacheClient:
    """Get cache client instance."""
    return CacheClient()
