from __future__ import annotations

import json

from app.core.config import settings
from app.core.redis_client import get_redis

_KEY_PREFIX = "qa:hist"
_ANSWER_SNIPPET_LEN = 400


def _key(user_id: int, meeting_id: int) -> str:
    return f"{_KEY_PREFIX}:{user_id}:{meeting_id}"


def get_history(user_id: int, meeting_id: int) -> list[dict]:
    """Returns alternating user/assistant messages for the last N turns, oldest first."""
    redis = get_redis()
    raw = redis.lrange(_key(user_id, meeting_id), 0, -1)
    messages: list[dict] = []
    for item in raw:
        try:
            entry = json.loads(item)
            messages.append({"role": "user", "content": entry["q"]})
            messages.append({"role": "assistant", "content": entry["a"]})
        except (json.JSONDecodeError, KeyError):
            continue
    return messages


def append_history(user_id: int, meeting_id: int, question: str, answer: str) -> None:
    """Appends a Q/A turn and trims the list to the configured max_turns."""
    redis = get_redis()
    key = _key(user_id, meeting_id)
    entry = json.dumps({"q": question, "a": answer[:_ANSWER_SNIPPET_LEN]}, ensure_ascii=False)
    pipe = redis.pipeline()
    pipe.rpush(key, entry)
    pipe.ltrim(key, -settings.qa_history_max_turns, -1)
    pipe.expire(key, settings.qa_history_ttl_seconds)
    pipe.execute()
