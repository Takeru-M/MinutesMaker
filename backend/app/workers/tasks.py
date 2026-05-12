from __future__ import annotations

import logging

from sqlmodel import Session

from app.db.session import engine
from app.services.rag.graph import answer_question_graph
from app.services.rag.ingest import ingest_global_knowledge, ingest_meeting_knowledge


logger = logging.getLogger(__name__)


def run_assistant_qa_job(
    *,
    meeting_id: int | None,
    user_id: int,
    question: str,
) -> dict:
    logger.debug(f"[STEP 4] Worker started - meeting_id={meeting_id}, user_id={user_id}, question={question[:50]}...")
    
    try:
        with Session(engine) as session:
            logger.debug(f"[STEP 4a] Starting RAG pipeline - question={question[:50]}...")
            result = answer_question_graph(
                session,
                meeting_id=meeting_id,
                user_id=user_id,
                question=question,
            )
            logger.debug(f"[STEP 4b] RAG pipeline completed - intent={result.intent}, scope={result.scope}, confidence={result.confidence}")

        response = {
            "meeting_id": meeting_id,
            "question": question,
            "intent": result.intent,
            "scope": result.scope,
            "answer": result.answer,
            "model_name": result.model_name,
            "confidence": result.confidence,
            "citations": [
                {
                    "chunk_id": c.chunk_id,
                    "source_type": c.source_type,
                    "source_entity_id": c.source_entity_id,
                    "chunk_index": c.chunk_index,
                    "score": c.score,
                    "snippet": c.snippet,
                }
                for c in result.citations
            ],
            "related_sources": result.related_sources,
        }
        logger.debug(f"[STEP 4c] Worker job completed successfully")
        return response
        
    except Exception as e:
        logger.error(f"[ERROR] Worker job failed - meeting_id={meeting_id}, question={question[:50]}, error={str(e)}", exc_info=True)
        raise


def run_meeting_ingest_job(*, meeting_id: int) -> dict:
    with Session(engine) as session:
        result = ingest_meeting_knowledge(session, meeting_id)

    return {
        "meeting_id": result.meeting_id,
        "indexed_sources": result.indexed_sources,
        "indexed_chunks": result.indexed_chunks,
        "skipped_sources": result.skipped_sources,
    }


def run_global_ingest_job() -> dict:
    with Session(engine) as session:
        result = ingest_global_knowledge(session)

    return {
        "meeting_id": result.meeting_id,
        "indexed_sources": result.indexed_sources,
        "indexed_chunks": result.indexed_chunks,
        "skipped_sources": result.skipped_sources,
    }
