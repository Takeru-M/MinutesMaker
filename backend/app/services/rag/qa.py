from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from time import perf_counter
from typing import Literal

from sqlmodel import Session, select

from app.core.config import settings
from app.crud.meeting_knowledge import create_qa_log, list_chunks_by_ids, list_sources_by_ids
from app.models.meeting import Meeting
from app.models.meeting_knowledge import MeetingQALog
from app.services.rag.clients import get_collection_name, get_openai_client, get_qdrant_client


@dataclass
class Citation:
    chunk_id: int
    source_type: str
    source_entity_id: int
    chunk_index: int
    score: float
    snippet: str


@dataclass
class AnswerResult:
    intent: str
    scope: str
    answer: str
    model_name: str
    confidence: float
    citations: list[Citation]
    related_sources: list[dict]


@dataclass
class ScoredHit:
    hit: object
    rerank_score: float


def answer_meeting_question(
    session: Session,
    *,
    meeting_id: int,
    user_id: int,
    question: str,
    scope: Literal["meeting_only", "cross_meeting", "global"] = "meeting_only",
    intent: Literal["auto", "context", "lookup", "term"] = "auto",
) -> AnswerResult:
    meeting = session.exec(select(Meeting).where(Meeting.id == meeting_id)).first()
    if meeting is None:
        raise ValueError("Meeting not found")

    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not configured")

    started_at = perf_counter()
    resolved_intent = _infer_intent(question) if intent == "auto" else intent
    resolved_scope = _resolve_scope(question=question, requested_scope=scope, intent=resolved_intent)

    query_vector = _embed_question(question)
    qdrant = get_qdrant_client()
    collection_name = get_collection_name()

    query_filter = _build_query_filter(meeting_id=meeting_id, scope=resolved_scope)

    retrieval_limit = settings.rag_retrieval_top_k
    if resolved_intent in {"context", "lookup"}:
        retrieval_limit = max(retrieval_limit, 12)
    elif resolved_intent == "term":
        retrieval_limit = max(retrieval_limit, 8)

    search_result = qdrant.search(
        collection_name=collection_name,
        query_vector=query_vector,
        limit=retrieval_limit,
        query_filter=query_filter,
        with_payload=True,
    )

    reranked_hits = _rerank_hits(session, list(search_result), intent=resolved_intent)
    filtered_hits = [item for item in reranked_hits if item.rerank_score >= settings.rag_score_threshold]

    chunk_ids = [
        int(item.hit.payload["chunk_id"])
        for item in filtered_hits
        if item.hit.payload and "chunk_id" in item.hit.payload
    ]
    chunks = list_chunks_by_ids(session, chunk_ids)
    chunk_by_id = {chunk.id: chunk for chunk in chunks if chunk.id is not None}

    citations: list[Citation] = []
    context_blocks: list[str] = []

    for item in filtered_hits:
        hit = item.hit
        payload = hit.payload or {}
        chunk_id = int(payload.get("chunk_id", 0))
        chunk = chunk_by_id.get(chunk_id)
        if chunk is None:
            continue

        source_type = str(payload.get("source_type", "unknown"))
        source_entity_id = int(payload.get("source_entity_id", 0))
        chunk_index = int(payload.get("chunk_index", 0))
        snippet = chunk.chunk_text[:220]

        citations.append(
            Citation(
                chunk_id=chunk_id,
                source_type=source_type,
                source_entity_id=source_entity_id,
                chunk_index=chunk_index,
                score=float(item.rerank_score),
                snippet=snippet,
            )
        )
        context_blocks.append(f"[{len(citations)}] ({source_type}:{source_entity_id}#{chunk_index})\n{chunk.chunk_text}")

    related_sources = _build_related_sources(session, filtered_hits)

    if not context_blocks:
        fallback = "該当する会議資料から回答根拠を見つけられませんでした。質問を具体化して再度お試しください。"
        _save_qa_log(
            session,
            meeting_id=meeting_id,
            user_id=user_id,
            question=question,
            answer=fallback,
            citations=citations,
            model_name=settings.llm_model,
            prompt_tokens=None,
            completion_tokens=None,
            total_tokens=None,
            latency_ms=int((perf_counter() - started_at) * 1000),
        )
        session.commit()
        return AnswerResult(
            intent=resolved_intent,
            scope=resolved_scope,
            answer=fallback,
            model_name=settings.llm_model,
            confidence=0.0,
            citations=[],
            related_sources=related_sources,
        )

    client = get_openai_client()
    response = client.chat.completions.create(
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
                    f"会議ID: {meeting_id}\n"
                    f"質問: {question}\n\n"
                    "以下のコンテキストを根拠に回答してください。"
                    "文末に参照番号を [1], [2] の形式で示してください。\n\n"
                    + "\n\n".join(context_blocks)
                ),
            },
        ],
    )

    answer = (response.choices[0].message.content or "").strip() or "回答を生成できませんでした。"

    usage = response.usage
    prompt_tokens = usage.prompt_tokens if usage else None
    completion_tokens = usage.completion_tokens if usage else None
    total_tokens = usage.total_tokens if usage else None

    _save_qa_log(
        session,
        meeting_id=meeting_id,
        user_id=user_id,
        question=question,
        answer=answer,
        citations=citations,
        model_name=settings.llm_model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        latency_ms=int((perf_counter() - started_at) * 1000),
    )
    session.commit()

    confidence = 0.0
    if citations:
        confidence = min(1.0, sum(max(0.0, c.score) for c in citations[:5]) / max(1, min(len(citations), 5)))

    return AnswerResult(
        intent=resolved_intent,
        scope=resolved_scope,
        answer=answer,
        model_name=settings.llm_model,
        confidence=confidence,
        citations=citations,
        related_sources=related_sources,
    )


def _embed_question(question: str) -> list[float]:
    client = get_openai_client()
    response = client.embeddings.create(model=settings.embedding_model, input=[question])
    return response.data[0].embedding


def _infer_intent(question: str) -> str:
    normalized = question.lower()
    if any(token in normalized for token in ["意味", "とは", "用語", "definition", "term"]):
        return "term"
    if any(token in normalized for token in ["背景", "文脈", "経緯", "なぜ", "why", "context"]):
        return "context"
    return "lookup"


def resolve_question_plan(
    *,
    question: str,
    requested_scope: Literal["meeting_only", "cross_meeting", "global"] = "meeting_only",
    requested_intent: Literal["auto", "context", "lookup", "term"] = "auto",
) -> tuple[Literal["context", "lookup", "term"], Literal["meeting_only", "cross_meeting", "global"]]:
    resolved_intent: Literal["context", "lookup", "term"]
    if requested_intent == "auto":
        resolved_intent = _infer_intent(question)
    else:
        resolved_intent = requested_intent

    resolved_scope = _resolve_scope(question=question, requested_scope=requested_scope, intent=resolved_intent)
    return resolved_intent, resolved_scope


def _resolve_scope(*, question: str, requested_scope: str, intent: str) -> str:
    if requested_scope != "meeting_only":
        return requested_scope

    normalized = question.lower()
    if intent in {"context", "lookup", "term"} and any(
        token in normalized
        for token in ["過去", "以前", "履歴", "他会議", "これまで", "history", "past", "previous"]
    ):
        return "cross_meeting"
    return requested_scope


def _build_query_filter(*, meeting_id: int, scope: str) -> dict | None:
    if scope == "meeting_only":
        return {"must": [{"key": "meeting_id", "match": {"value": meeting_id}}]}
    if scope == "cross_meeting":
        return {
            "must": [
                {
                    "key": "source_type",
                    "match": {"any": ["meeting", "agenda", "minutes", "notice", "content", "content_attachment"]},
                }
            ]
        }
    return None


def _rerank_hits(session: Session, hits: list, *, intent: str) -> list[ScoredHit]:
    source_ids: list[int] = []
    for hit in hits:
        payload = hit.payload or {}
        source_id = payload.get("source_id")
        if isinstance(source_id, int) and source_id not in source_ids:
            source_ids.append(source_id)

    source_map = {source.id: source for source in list_sources_by_ids(session, source_ids) if source.id is not None}

    type_bonus = {
        "minutes": 0.08,
        "agenda": 0.06,
        "meeting": 0.04,
        "notice": 0.03,
        "content": 0.03,
        "content_attachment": 0.02,
    }

    intent_type_bonus = {
        "term": {"notice": 0.03, "content": 0.03},
        "context": {"minutes": 0.02, "agenda": 0.02},
    }

    scored: list[ScoredHit] = []
    used_source_type_count: dict[str, int] = {}
    used_source_id_count: dict[int, int] = {}

    prelim: list[tuple[object, float, str, int | None]] = []
    for hit in hits:
        payload = hit.payload or {}
        source_type = str(payload.get("source_type", "unknown"))
        source_id = payload.get("source_id") if isinstance(payload.get("source_id"), int) else None
        source = source_map.get(source_id) if source_id is not None else None

        score = float(hit.score or 0.0)
        score += type_bonus.get(source_type, 0.0)
        score += intent_type_bonus.get(intent, {}).get(source_type, 0.0)
        score += _recency_bonus(source.updated_at if source is not None else None)
        prelim.append((hit, score, source_type, source_id))

    prelim.sort(key=lambda item: item[1], reverse=True)

    for hit, score, source_type, source_id in prelim:
        type_count = used_source_type_count.get(source_type, 0)
        source_repeat_penalty = 0.0
        type_diversity_penalty = 0.0

        if source_id is not None:
            same_source_count = used_source_id_count.get(source_id, 0)
            if same_source_count >= 1:
                source_repeat_penalty = 0.08 * same_source_count
            used_source_id_count[source_id] = same_source_count + 1

        if type_count >= 2:
            type_diversity_penalty = 0.04 * (type_count - 1)
        used_source_type_count[source_type] = type_count + 1

        final_score = max(0.0, score - source_repeat_penalty - type_diversity_penalty)
        scored.append(ScoredHit(hit=hit, rerank_score=final_score))

    scored.sort(key=lambda item: item.rerank_score, reverse=True)
    return scored


def _recency_bonus(updated_at: datetime | None) -> float:
    if updated_at is None:
        return 0.0
    delta_days = max(0, (datetime.utcnow() - updated_at).days)
    if delta_days <= 7:
        return 0.05
    if delta_days <= 30:
        return 0.03
    if delta_days <= 90:
        return 0.015
    return 0.0


def _build_related_sources(session: Session, hits: list[ScoredHit]) -> list[dict]:
    source_ids: list[int] = []
    score_by_source_id: dict[int, float] = {}

    for item in hits:
        hit = item.hit
        payload = hit.payload or {}
        source_id = payload.get("source_id")
        if not isinstance(source_id, int):
            continue
        if source_id not in source_ids:
            source_ids.append(source_id)
        score_by_source_id[source_id] = max(score_by_source_id.get(source_id, 0.0), float(item.rerank_score or 0.0))

    sources = list_sources_by_ids(session, source_ids)

    related = [
        {
            "source_type": source.source_type,
            "source_entity_id": source.source_entity_id,
            "title": source.source_label or f"{source.source_type}:{source.source_entity_id}",
            "meeting_id": source.meeting_id,
            "score": score_by_source_id.get(source.id or 0, 0.0),
        }
        for source in sources
    ]
    related.sort(key=lambda item: item["score"], reverse=True)
    return related[:8]


def _save_qa_log(
    session: Session,
    *,
    meeting_id: int,
    user_id: int,
    question: str,
    answer: str,
    citations: list[Citation],
    model_name: str,
    prompt_tokens: int | None,
    completion_tokens: int | None,
    total_tokens: int | None,
    latency_ms: int,
) -> None:
    log = MeetingQALog(
        meeting_id=meeting_id,
        user_id=user_id,
        question=question,
        answer=answer,
        retrieved_chunk_ids=[citation.chunk_id for citation in citations],
        model_name=model_name,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        latency_ms=latency_ms,
    )
    create_qa_log(session, log)
