from __future__ import annotations

import importlib
import logging
from dataclasses import dataclass
from time import perf_counter
from typing import Any, TypedDict

from sqlmodel import Session

from app.core.config import settings
from app.crud.meeting_knowledge import list_chunks_by_ids
from app.services.rag import qa as qa_service
from app.services.rag.clients import get_collection_name, get_qdrant_client

logger = logging.getLogger(__name__)


@dataclass
class RetrievalState:
    search_result: list[Any]
    query_vector: list[float]
    retrieval_limit: int


class QAState(TypedDict, total=False):
    session: Session
    meeting_id: int | None
    user_id: int
    question: str
    resolved_scope: str
    resolved_intent: str
    scope_expanded: bool
    retrieval: RetrievalState
    reranked_hits: list[qa_service.ScoredHit]
    citations: list[qa_service.Citation]
    related_sources: list[dict]
    context_blocks: list[str]
    answer_result: qa_service.AnswerResult
    started_at: float


def _classify_node(state: QAState) -> QAState:
    logger.debug(f"[RAG 4-1] Classifying question - question={state['question'][:50]}...")
    meeting_id = state.get("meeting_id")
    intent, scope = qa_service.classify_question(state["question"], meeting_id)
    logger.debug(f"[RAG 4-1] Classification complete - intent={intent}, scope={scope}")
    return {
        "resolved_intent": intent,
        "resolved_scope": scope,
        "scope_expanded": False,
        "started_at": perf_counter(),
    }


def _retrieve_node(state: QAState) -> QAState:
    logger.debug(f"[RAG 4-2] Starting retrieval - intent={state.get('resolved_intent')}, scope={state.get('resolved_scope')}")
    if not settings.openai_api_key:
        logger.error("[RAG 4-2] OPENAI_API_KEY is not configured")
        raise ValueError("OPENAI_API_KEY is not configured")

    question = state["question"]
    meeting_id = state.get("meeting_id")
    resolved_intent = state.get("resolved_intent", "lookup")
    resolved_scope = state.get("resolved_scope", "global")

    retrieval_limit = settings.rag_retrieval_top_k
    if resolved_intent in {"context", "lookup"}:
        retrieval_limit = max(retrieval_limit, 12)
    elif resolved_intent == "term":
        retrieval_limit = max(retrieval_limit, 8)

    logger.debug(f"[RAG 4-2a] Connecting to Qdrant")
    qdrant = get_qdrant_client()
    collection_name = get_collection_name()

    if not qdrant.collection_exists(collection_name):
        logger.warning(f"[RAG 4-2a] Collection not found - collection_name={collection_name}")
        return {
            "retrieval": RetrievalState(
                search_result=[],
                query_vector=[],
                retrieval_limit=retrieval_limit,
            )
        }

    logger.debug(f"[RAG 4-2b] Embedding question")
    query_vector = qa_service._embed_question(question)
    logger.debug(f"[RAG 4-2c] Querying Qdrant - retrieval_limit={retrieval_limit}")
    search_result = qdrant.query_points(
        collection_name=collection_name,
        query=query_vector,
        limit=retrieval_limit,
        query_filter=qa_service._build_query_filter(
            meeting_id=meeting_id,
            scope=resolved_scope,
        ),
        with_payload=True,
    ).points
    
    search_result_list = list(search_result)
    logger.debug(f"[RAG 4-2d] Retrieval complete - results_count={len(search_result_list)}")

    return {
        "retrieval": RetrievalState(
            search_result=search_result_list,
            query_vector=query_vector,
            retrieval_limit=retrieval_limit,
        )
    }


def _rerank_node(state: QAState) -> QAState:
    logger.debug(f"[RAG 4-3] Starting reranking")
    session = state["session"]
    retrieval = state["retrieval"]
    reranked_hits = qa_service._rerank_hits(
        session,
        retrieval.search_result,
        intent=state.get("resolved_intent", "lookup"),
    )
    filtered_hits = [item for item in reranked_hits if item.rerank_score >= settings.rag_score_threshold]

    chunk_ids = [
        int(item.hit.payload["chunk_id"])
        for item in filtered_hits
        if item.hit.payload and "chunk_id" in item.hit.payload
    ]
    chunks = list_chunks_by_ids(session, chunk_ids)
    chunk_by_id = {chunk.id: chunk for chunk in chunks if chunk.id is not None}

    citations: list[qa_service.Citation] = []
    context_blocks: list[str] = []
    for item in filtered_hits:
        payload = item.hit.payload or {}
        chunk_id = int(payload.get("chunk_id", 0))
        chunk = chunk_by_id.get(chunk_id)
        if chunk is None:
            continue

        citations.append(
            qa_service.Citation(
                chunk_id=chunk_id,
                source_type=str(payload.get("source_type", "unknown")),
                source_entity_id=int(payload.get("source_entity_id", 0)),
                chunk_index=int(payload.get("chunk_index", 0)),
                score=float(item.rerank_score),
                snippet=chunk.chunk_text[:220],
            )
        )
        context_blocks.append(
            f"[{len(citations)}] ({payload.get('source_type', 'unknown')}:{payload.get('source_entity_id', 0)}#{payload.get('chunk_index', 0)})\n{chunk.chunk_text}"
        )

    return {
        "reranked_hits": filtered_hits,
        "citations": citations,
        "context_blocks": context_blocks,
        "related_sources": qa_service._build_related_sources(session, filtered_hits),
    }


def _should_expand_scope(state: QAState) -> str:
    if state.get("scope_expanded"):
        logger.debug(f"[RAG 4-4] Scope already expanded, moving to answer")
        return "answer"
    if state.get("citations"):
        logger.debug(f"[RAG 4-4] Citations found ({len(state.get('citations', []))}), moving to answer")
        return "answer"
    if state.get("resolved_scope") == "global":
        logger.debug(f"[RAG 4-4] Already in global scope, moving to answer")
        return "answer"
    logger.debug(f"[RAG 4-4] No citations found with scope {state.get('resolved_scope')}, expanding scope")
    return "expand"


def _scope_expand_node(_state: QAState) -> QAState:
    logger.debug(f"[RAG 4-5] Expanding scope to global")
    return {"resolved_scope": "global", "scope_expanded": True}


def _answer_node(state: QAState) -> QAState:
    logger.debug(f"[RAG 4-6] Starting answer generation - citations_count={len(state.get('citations', []))}")
    session = state["session"]
    result = qa_service.build_answer(
        session,
        meeting_id=state.get("meeting_id"),
        user_id=state["user_id"],
        question=state["question"],
        intent=state.get("resolved_intent", "lookup"),
        scope=state.get("resolved_scope", "global"),
        citations=state.get("citations", []),
        context_blocks=state.get("context_blocks", []),
        related_sources=state.get("related_sources", []),
        started_at=state.get("started_at", perf_counter()),
    )
    logger.debug(f"[RAG 4-6] Answer generation complete - confidence={result.confidence}, model={result.model_name}")
    return {"answer_result": result}


def _build_graph():
    try:
        graph_module = importlib.import_module("langgraph.graph")
        END = graph_module.END
        StateGraph = graph_module.StateGraph
    except ModuleNotFoundError:
        return None

    graph = StateGraph(QAState)
    graph.add_node("classify", _classify_node)
    graph.add_node("retrieve", _retrieve_node)
    graph.add_node("rerank", _rerank_node)
    graph.add_node("scope_expand", _scope_expand_node)
    graph.add_node("answer", _answer_node)

    graph.set_entry_point("classify")
    graph.add_edge("classify", "retrieve")
    graph.add_edge("retrieve", "rerank")
    graph.add_conditional_edges(
        "rerank",
        _should_expand_scope,
        {"expand": "scope_expand", "answer": "answer"},
    )
    graph.add_edge("scope_expand", "retrieve")
    graph.add_edge("answer", END)
    return graph.compile()


_GRAPH = _build_graph()


def _fallback_answer(
    session: Session,
    *,
    meeting_id: int | None,
    user_id: int,
    question: str,
) -> qa_service.AnswerResult:
    """Fallback when LangGraph is unavailable: classify then retrieve and answer directly."""
    intent, scope = qa_service.classify_question(question, meeting_id)

    retrieval_limit = settings.rag_retrieval_top_k
    if intent in {"context", "lookup"}:
        retrieval_limit = max(retrieval_limit, 12)
    elif intent == "term":
        retrieval_limit = max(retrieval_limit, 8)

    qdrant = get_qdrant_client()
    collection_name = get_collection_name()
    collection_ready = qdrant.collection_exists(collection_name)

    if not collection_ready:
        query_vector: list[float] = []
        search_result: list = []
    else:
        query_vector = qa_service._embed_question(question)
        search_result = list(
            qdrant.query_points(
                collection_name=collection_name,
                query=query_vector,
                limit=retrieval_limit,
                query_filter=qa_service._build_query_filter(meeting_id=meeting_id, scope=scope),
                with_payload=True,
            ).points
        )

    reranked_hits = qa_service._rerank_hits(session, search_result, intent=intent)
    filtered_hits = [item for item in reranked_hits if item.rerank_score >= settings.rag_score_threshold]

    if not filtered_hits and scope == "meeting_only":
        if collection_ready:
            search_result = list(
                qdrant.query_points(
                    collection_name=collection_name,
                    query=query_vector,
                    limit=retrieval_limit,
                    query_filter=None,
                    with_payload=True,
                ).points
            )
            reranked_hits = qa_service._rerank_hits(session, search_result, intent=intent)
            filtered_hits = [item for item in reranked_hits if item.rerank_score >= settings.rag_score_threshold]
        scope = "global"

    from app.crud.meeting_knowledge import list_chunks_by_ids
    chunk_ids = [
        int(item.hit.payload["chunk_id"])
        for item in filtered_hits
        if item.hit.payload and "chunk_id" in item.hit.payload
    ]
    chunks = list_chunks_by_ids(session, chunk_ids)
    chunk_by_id = {chunk.id: chunk for chunk in chunks if chunk.id is not None}

    citations: list[qa_service.Citation] = []
    context_blocks: list[str] = []
    for item in filtered_hits:
        payload = item.hit.payload or {}
        chunk_id = int(payload.get("chunk_id", 0))
        chunk = chunk_by_id.get(chunk_id)
        if chunk is None:
            continue
        citations.append(
            qa_service.Citation(
                chunk_id=chunk_id,
                source_type=str(payload.get("source_type", "unknown")),
                source_entity_id=int(payload.get("source_entity_id", 0)),
                chunk_index=int(payload.get("chunk_index", 0)),
                score=float(item.rerank_score),
                snippet=chunk.chunk_text[:220],
            )
        )
        context_blocks.append(
            f"[{len(citations)}] ({payload.get('source_type', 'unknown')}:{payload.get('source_entity_id', 0)}#{payload.get('chunk_index', 0)})\n{chunk.chunk_text}"
        )

    related_sources = qa_service._build_related_sources(session, filtered_hits)
    return qa_service.build_answer(
        session,
        meeting_id=meeting_id,
        user_id=user_id,
        question=question,
        intent=intent,
        scope=scope,
        citations=citations,
        context_blocks=context_blocks,
        related_sources=related_sources,
        started_at=perf_counter(),
    )


def answer_question_graph(
    session: Session,
    *,
    meeting_id: int | None,
    user_id: int,
    question: str,
) -> qa_service.AnswerResult:
    logger.debug(f"[RAG 4] Starting answer_question_graph - meeting_id={meeting_id}, user_id={user_id}")
    
    if _GRAPH is None:
        logger.debug(f"[RAG 4] LangGraph not available, using fallback")
        return _fallback_answer(session, meeting_id=meeting_id, user_id=user_id, question=question)

    state: QAState = {
        "session": session,
        "meeting_id": meeting_id,
        "user_id": user_id,
        "question": question,
    }
    logger.debug(f"[RAG 4] Invoking LangGraph pipeline")
    output = _GRAPH.invoke(state)
    result = output.get("answer_result")
    if result is None:
        logger.error(f"[RAG 4] Failed to build answer - output keys: {output.keys()}")
        raise ValueError("Failed to build answer")
    logger.debug(f"[RAG 4] Graph pipeline complete - answer_length={len(result.answer) if result.answer else 0}")
    return result
