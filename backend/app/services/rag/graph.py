from __future__ import annotations

import importlib
from dataclasses import dataclass
from time import perf_counter
from typing import Any, TypedDict

from sqlmodel import Session

from app.core.config import settings
from app.crud.meeting_knowledge import list_chunks_by_ids
from app.services.rag import qa as qa_service
from app.services.rag.clients import get_collection_name, get_qdrant_client


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
    meeting_id = state.get("meeting_id")
    intent, scope = qa_service.classify_question(state["question"], meeting_id)
    return {
        "resolved_intent": intent,
        "resolved_scope": scope,
        "scope_expanded": False,
        "started_at": perf_counter(),
    }


def _retrieve_node(state: QAState) -> QAState:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not configured")

    question = state["question"]
    meeting_id = state.get("meeting_id")
    resolved_intent = state.get("resolved_intent", "lookup")
    resolved_scope = state.get("resolved_scope", "global")

    query_vector = qa_service._embed_question(question)
    retrieval_limit = settings.rag_retrieval_top_k
    if resolved_intent in {"context", "lookup"}:
        retrieval_limit = max(retrieval_limit, 12)
    elif resolved_intent == "term":
        retrieval_limit = max(retrieval_limit, 8)

    search_result = get_qdrant_client().search(
        collection_name=get_collection_name(),
        query_vector=query_vector,
        limit=retrieval_limit,
        query_filter=qa_service._build_query_filter(
            meeting_id=meeting_id,
            scope=resolved_scope,
        ),
        with_payload=True,
    )

    return {
        "retrieval": RetrievalState(
            search_result=list(search_result),
            query_vector=query_vector,
            retrieval_limit=retrieval_limit,
        )
    }


def _rerank_node(state: QAState) -> QAState:
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
        return "answer"
    if state.get("citations"):
        return "answer"
    if state.get("resolved_scope") == "global":
        return "answer"
    return "expand"


def _scope_expand_node(_state: QAState) -> QAState:
    return {"resolved_scope": "global", "scope_expanded": True}


def _answer_node(state: QAState) -> QAState:
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

    query_vector = qa_service._embed_question(question)
    retrieval_limit = settings.rag_retrieval_top_k
    if intent in {"context", "lookup"}:
        retrieval_limit = max(retrieval_limit, 12)
    elif intent == "term":
        retrieval_limit = max(retrieval_limit, 8)

    search_result = get_qdrant_client().search(
        collection_name=get_collection_name(),
        query_vector=query_vector,
        limit=retrieval_limit,
        query_filter=qa_service._build_query_filter(meeting_id=meeting_id, scope=scope),
        with_payload=True,
    )

    reranked_hits = qa_service._rerank_hits(session, list(search_result), intent=intent)
    filtered_hits = [item for item in reranked_hits if item.rerank_score >= settings.rag_score_threshold]

    if not filtered_hits and scope == "meeting_only":
        search_result = get_qdrant_client().search(
            collection_name=get_collection_name(),
            query_vector=query_vector,
            limit=retrieval_limit,
            query_filter=None,
            with_payload=True,
        )
        reranked_hits = qa_service._rerank_hits(session, list(search_result), intent=intent)
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
    if _GRAPH is None:
        return _fallback_answer(session, meeting_id=meeting_id, user_id=user_id, question=question)

    state: QAState = {
        "session": session,
        "meeting_id": meeting_id,
        "user_id": user_id,
        "question": question,
    }
    output = _GRAPH.invoke(state)
    result = output.get("answer_result")
    if result is None:
        raise ValueError("Failed to build answer")
    return result
