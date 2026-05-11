"""
Cache key definitions and TTL constants for MinutesMaker.

Centralized cache key patterns and TTL values for consistency.
"""

from __future__ import annotations

from app.core.config import settings
from hashlib import sha256


class CacheKeys:
    """Centralized cache key definitions."""

    # Meeting lists (short TTL due to frequent updates)
    MEETINGS_LIST = "meetings:list"
    MEETING_DETAIL = lambda mid: f"meeting:{mid}:detail"

    # Recent agendas (for home page)
    LATEST_AGENDAS = "agendas:latest"
    AGENDA_DETAIL = lambda aid: f"agenda:{aid}:detail"

    # QA related (medium TTL for consistency)
    QA_RESULT = lambda mid, qhash: f"qa:meeting:{mid}:qhash:{qhash}"
    QA_RESULTS_BY_MEETING = lambda mid: f"qa:meeting:{mid}:results"

    # Embeddings (persistent across restarts)
    EMBEDDING_CACHE = lambda text_hash: f"embedding:sha256:{text_hash}"

    # Knowledge chunks (referenced from QA)
    KNOWLEDGE_CHUNKS = lambda cid: f"knowledge:chunk:{cid}"
    KNOWLEDGE_SOURCES = lambda sid: f"knowledge:source:{sid}"

    # Other frequently accessed data
    NOTICES_LIST = "notices:list:recent"


class CacheTTLs:
    """TTL constants in seconds."""

    # Short TTLs for frequently updated data
    MEETINGS_LIST = 120  # 2 minutes
    LATEST_AGENDAS = 300  # 5 minutes
    NOTICES_LIST = 300  # 5 minutes

    # Medium TTLs for derived data
    QA_RESULTS = settings.redis_qa_cache_ttl_seconds  # Usually 3600 (1 hour)
    MEETING_DETAIL = 600  # 10 minutes

    # Long TTLs for relatively static data
    EMBEDDINGS = 86400 * 7  # 7 days
    KNOWLEDGE_CHUNKS = 3600  # 1 hour
    KNOWLEDGE_SOURCES = 3600  # 1 hour


def compute_question_hash(meeting_id: int, question: str) -> str:
    """
    Compute deterministic hash for question caching.

    Same question should map to same hash for cache hits.
    """
    content = f"{meeting_id}:{question}".encode("utf-8")
    return sha256(content).hexdigest()[:16]  # 16 char hex prefix
