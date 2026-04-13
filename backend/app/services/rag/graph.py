from __future__ import annotations

import importlib
from dataclasses import dataclass
from time import perf_counter
from typing import Any, Literal, TypedDict

from sqlmodel import Session

from app.core.config import settings
from app.crud.meeting_knowledge import list_chunks_by_ids
from app.models.meeting import Meeting
from app.services.rag import qa as qa_service
from app.services.rag.clients import get_collection_name, get_openai_client, get_qdrant_client


@dataclass
class RetrievalState:
    search_result: list[Any]
    query_vector: list[float]
    retrieval_limit: int


class QAState(TypedDict, total=False):
    session: Session
    meeting_id: int
    user_id: int
    question: str
    requested_scope: Literal["meeting_only", "cross_meeting", "global"]
    requested_intent: Literal["auto", "context", "lookup", "term"]
    resolved_scope: Literal["meeting_only", "cross_meeting", "global"]
    resolved_intent: Literal["context", "lookup", "term"]
    retrieval: RetrievalState
    reranked_hits: list[qa_service.ScoredHit]
    citations: list[qa_service.Citation]
    related_sources: list[dict]
    context_blocks: list[str]
    answer_result: qa_service.AnswerResult
    started_at: float


def _classify_node(state: QAState) -> QAState:
    resolved_intent, resolved_scope = qa_service.resolve_question_plan(
        question=state["question"],
        requested_scope=state.get("requested_scope", "meeting_only"),
        requested_intent=state.get("requested_intent", "auto"),
    )
    return {
        "resolved_intent": resolved_intent,
        "resolved_scope": resolved_scope,
        "started_at": perf_counter(),
    }


def _retrieve_node(state: QAState) -> QAState:
    session = state["session"]
    meeting = session.get(Meeting, state["meeting_id"])
    if meeting is None:
        raise ValueError("Meeting not found")

    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not configured")

    query_vector = qa_service._embed_question(state["question"])
    retrieval_limit = settings.rag_retrieval_top_k
    if state.get("resolved_intent") in {"context", "lookup"}:
        retrieval_limit = max(retrieval_limit, 12)
    elif state.get("resolved_intent") == "term":
        retrieval_limit = max(retrieval_limit, 8)

    search_result = get_qdrant_client().search(
        collection_name=get_collection_name(),
        query_vector=query_vector,
        limit=retrieval_limit,
        query_filter=qa_service._build_query_filter(
            meeting_id=state["meeting_id"],
            scope=state.get("resolved_scope", "meeting_only"),
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


def _answer_node(state: QAState) -> QAState:
    session = state["session"]
    started_at = state.get("started_at", perf_counter())
    citations = state.get("citations", [])
    related_sources = state.get("related_sources", [])
    context_blocks = state.get("context_blocks", [])

    if not context_blocks:
        fallback = "該当する会議資料から回答根拠を見つけられませんでした。質問を具体化して再度お試しください。"
        qa_service._save_qa_log(
            session,
            meeting_id=state["meeting_id"],
            user_id=state["user_id"],
            question=state["question"],
            answer=fallback,
            citations=citations,
            model_name=settings.llm_model,
            prompt_tokens=None,
            completion_tokens=None,
            total_tokens=None,
            latency_ms=int((perf_counter() - started_at) * 1000),
        )
        session.commit()
        return {
            "answer_result": qa_service.AnswerResult(
                intent=state.get("resolved_intent", "lookup"),
                scope=state.get("resolved_scope", "meeting_only"),
                answer=fallback,
                model_name=settings.llm_model,
                confidence=0.0,
                citations=[],
                related_sources=related_sources,
            )
        }

    response = get_openai_client().chat.completions.create(
        model=settings.llm_model,
        temperature=0.1,
        messages=[
            {
                "role": "system",
                "content": (
                    "あなたは会議アシスタントです。与えられたコンテキストのみを根拠に回答し、"
                    "根拠が不足する場合は不足している旨を明示してください。"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"会議ID: {state['meeting_id']}\n"
                    f"質問: {state['question']}\n\n"
                    "以下のコンテキストを根拠に回答してください。"
                    "文末に参照番号を [1], [2] の形式で示してください。\n\n"
                    + "\n\n".join(context_blocks)
                ),
            },
        ],
    )

    answer = (response.choices[0].message.content or "").strip() or "回答を生成できませんでした。"
    usage = response.usage
    qa_service._save_qa_log(
        session,
        meeting_id=state["meeting_id"],
        user_id=state["user_id"],
        question=state["question"],
        answer=answer,
        citations=citations,
        model_name=settings.llm_model,
        prompt_tokens=usage.prompt_tokens if usage else None,
        completion_tokens=usage.completion_tokens if usage else None,
        total_tokens=usage.total_tokens if usage else None,
        latency_ms=int((perf_counter() - started_at) * 1000),
    )
    session.commit()

    confidence = 0.0
    if citations:
        confidence = min(1.0, sum(max(0.0, citation.score) for citation in citations[:5]) / max(1, min(len(citations), 5)))

    return {
        "answer_result": qa_service.AnswerResult(
            intent=state.get("resolved_intent", "lookup"),
            scope=state.get("resolved_scope", "meeting_only"),
            answer=answer,
            model_name=settings.llm_model,
            confidence=confidence,
            citations=citations,
            related_sources=related_sources,
        )
    }


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
    graph.add_node("answer", _answer_node)
    graph.set_entry_point("classify")
    graph.add_edge("classify", "retrieve")
    graph.add_edge("retrieve", "rerank")
    graph.add_edge("rerank", "answer")
    graph.add_edge("answer", END)
    return graph.compile()


_GRAPH = _build_graph()


def answer_meeting_question_graph(
    session: Session,
    *,
    meeting_id: int,
    user_id: int,
    question: str,
    scope: Literal["meeting_only", "cross_meeting", "global"] = "meeting_only",
    intent: Literal["auto", "context", "lookup", "term"] = "auto",
) -> qa_service.AnswerResult:
    if _GRAPH is None:
        return qa_service.answer_meeting_question(
            session,
            meeting_id=meeting_id,
            user_id=user_id,
            question=question,
            scope=scope,
            intent=intent,
        )

    state: QAState = {
        "session": session,
        "meeting_id": meeting_id,
        "user_id": user_id,
        "question": question,
        "requested_scope": scope,
        "requested_intent": intent,
    }
    output = _GRAPH.invoke(state)
    result = output.get("answer_result")
    if result is None:
        raise ValueError("Failed to build answer")
    return result
