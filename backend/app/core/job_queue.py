from __future__ import annotations

from redis import Redis
from rq import Queue

from app.core.redis_client import get_redis

QA_QUEUE_NAME = "qa"
INGEST_QUEUE_NAME = "ingest"
LOW_QUEUE_NAME = "low"


def get_queue(name: str, redis_conn: Redis | None = None) -> Queue:
    connection = redis_conn or get_redis()
    return Queue(name=name, connection=connection)


def get_qa_queue(redis_conn: Redis | None = None) -> Queue:
    return get_queue(QA_QUEUE_NAME, redis_conn)


def get_ingest_queue(redis_conn: Redis | None = None) -> Queue:
    return get_queue(INGEST_QUEUE_NAME, redis_conn)


def get_low_queue(redis_conn: Redis | None = None) -> Queue:
    return get_queue(LOW_QUEUE_NAME, redis_conn)
