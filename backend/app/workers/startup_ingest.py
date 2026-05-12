"""Startup knowledge ingestion script.

Runs at worker container startup to ingest all meetings and global knowledge.
Content-hash deduplication ensures only changed sources are re-embedded.
If the Qdrant collection is empty (e.g. after a volume reset), all sources are
force-re-ingested regardless of cached content hashes.
"""
from __future__ import annotations

import logging
import time

from sqlalchemy import inspect
from sqlmodel import Session, select

from app.core.config import settings
from app.db.session import engine
from app.db.init_db import init_db
from app.models.meeting import Meeting
from app.services.rag.clients import get_collection_name, get_qdrant_client
from app.services.rag.ingest import ingest_global_knowledge, ingest_meeting_knowledge

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_QDRANT_WAIT_TIMEOUT = 60
_QDRANT_WAIT_INTERVAL = 3
_DB_WAIT_TIMEOUT = 120
_DB_WAIT_INTERVAL = 3


def _wait_for_db() -> None:
    """Poll MySQL until the meetings table exists (i.e. init_db has completed)."""
    deadline = time.time() + _DB_WAIT_TIMEOUT
    while True:
        try:
            with engine.connect() as conn:
                tables = inspect(conn).get_table_names()
            if "meetings" in tables:
                logger.info("DB schema is ready")
                return
            raise RuntimeError("meetings table not yet created")
        except Exception as exc:
            remaining = deadline - time.time()
            if remaining <= 0:
                logger.warning("DB schema not ready after %ds — running init_db()", _DB_WAIT_TIMEOUT)
                init_db()
                return
            logger.info("Waiting for DB schema... (%.0fs remaining) — %s", remaining, exc)
            time.sleep(_DB_WAIT_INTERVAL)


def _wait_for_qdrant() -> None:
    """Poll Qdrant until it is ready to accept connections."""
    deadline = time.time() + _QDRANT_WAIT_TIMEOUT
    while True:
        try:
            get_qdrant_client().get_collections()
            logger.info("Qdrant is ready")
            return
        except Exception as exc:
            remaining = deadline - time.time()
            if remaining <= 0:
                raise RuntimeError(f"Qdrant not ready after {_QDRANT_WAIT_TIMEOUT}s") from exc
            logger.info("Waiting for Qdrant... (%.0fs remaining) — %s", remaining, exc)
            time.sleep(_QDRANT_WAIT_INTERVAL)


def _is_collection_empty() -> bool:
    """Return True when the Qdrant collection is absent or contains no vectors."""
    qdrant = get_qdrant_client()
    collection_name = get_collection_name()
    if not qdrant.collection_exists(collection_name):
        return True
    info = qdrant.get_collection(collection_name)
    return (info.points_count or 0) == 0


def run() -> None:
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY not set — skipping startup ingest")
        return

    _wait_for_db()
    _wait_for_qdrant()
    force = _is_collection_empty()
    if force:
        logger.info("Qdrant collection is empty — forcing full re-ingest of all sources")

    logger.info("=== Startup knowledge ingestion started ===")
    total_sources = 0
    total_chunks = 0
    errors = 0

    with Session(engine) as session:
        meetings = session.exec(select(Meeting)).all()
        logger.info("Found %d meetings to ingest", len(meetings))

        for meeting in meetings:
            if meeting.id is None:
                continue
            try:
                result = ingest_meeting_knowledge(session, meeting.id, force=force)
                if result.indexed_sources > 0:
                    logger.info(
                        "Meeting %d: +%d sources, +%d chunks (skipped %d)",
                        meeting.id, result.indexed_sources, result.indexed_chunks, result.skipped_sources,
                    )
                total_sources += result.indexed_sources
                total_chunks += result.indexed_chunks
            except Exception as exc:
                logger.error("Meeting %d ingest failed: %s", meeting.id, exc)
                errors += 1

        try:
            result = ingest_global_knowledge(session, force=force)
            if result.indexed_sources > 0:
                logger.info(
                    "Global: +%d sources, +%d chunks (skipped %d)",
                    result.indexed_sources, result.indexed_chunks, result.skipped_sources,
                )
            total_sources += result.indexed_sources
            total_chunks += result.indexed_chunks
        except Exception as exc:
            logger.error("Global ingest failed: %s", exc)
            errors += 1

    logger.info(
        "=== Startup ingest done: %d sources, %d chunks indexed, %d errors ===",
        total_sources, total_chunks, errors,
    )


if __name__ == "__main__":
    run()
