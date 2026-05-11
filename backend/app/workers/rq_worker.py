from __future__ import annotations

import os

from rq import Worker

from app.core.job_queue import INGEST_QUEUE_NAME, LOW_QUEUE_NAME, QA_QUEUE_NAME, get_queue
from app.core.redis_client import get_redis


def run_worker() -> None:
    redis_conn = get_redis()
    queue_names = os.getenv("RQ_QUEUES", f"{QA_QUEUE_NAME},{INGEST_QUEUE_NAME},{LOW_QUEUE_NAME}")
    names = [name.strip() for name in queue_names.split(",") if name.strip()]

    queues = [get_queue(name, redis_conn) for name in names]

    worker = Worker(queues)
    worker.work(with_scheduler=True)


if __name__ == "__main__":
    run_worker()
