from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime
from time import perf_counter
from typing import Literal

from qdrant_client import models as qdrant_models
from sqlmodel import Session, select

from app.core.config import settings
from app.crud.meeting_knowledge import create_qa_log, list_chunks_by_ids, list_sources_by_ids
from app.models.meeting import Meeting
from app.models.meeting_knowledge import MeetingQALog
from app.services.rag.clients import get_collection_name, get_openai_client, get_qdrant_client
from app.services.rag.history import append_history, get_history

logger = logging.getLogger(__name__)


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


def classify_question(question: str, meeting_id: int | None) -> tuple[str, str]:
    """Use LLM to determine intent and initial scope for a question.

    Returns (intent, scope) where:
      intent: "term" | "context" | "lookup"
      scope: "meeting_only" | "global"
    """
    meeting_context = (
        f"この質問は会議ID {meeting_id} のコンテキストで行われています。"
        if meeting_id is not None
        else "特定の会議コンテキストはありません。"
    )

    logger.debug(f"[classify] Calling LLM to classify question - meeting_id={meeting_id}, question={question[:50]}...")
    try:
        response = get_openai_client().chat.completions.create(
            model=settings.llm_model,
            temperature=0.0,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "あなたは会議管理システムの質問分類器です。"
                        "ユーザーの質問を分析し、JSONのみで回答してください。"
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"{meeting_context}\n"
                        f"質問: {question}\n\n"
                        "以下のJSONで回答してください:\n"
                        '{"intent": "term"|"context"|"lookup", "scope": "meeting_only"|"global"}\n\n'
                        "intent の基準:\n"
                        "- term: 用語・定義の説明を求めている\n"
                        "- context: 背景・経緯・理由を求めている\n"
                        "- lookup: 特定の事実・決定事項・行動を確認している\n\n"
                        "scope の基準:\n"
                        "- meeting_only: 特定の会議IDの資料のみで答えられる質問（meeting_idがある場合のみ）\n"
                        "- global: 複数会議にまたがる・あるいは会議IDが指定されていない質問"
                    ),
                },
            ],
        )
        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)
        logger.debug(f"[classify] LLM classification result - raw={raw}")
    except Exception as exc:
        logger.warning(f"[classify] LLM classification failed, using defaults - error={exc}", exc_info=True)
        data = {}

    intent = data.get("intent", "lookup")
    if intent not in {"term", "context", "lookup"}:
        intent = "lookup"

    scope = data.get("scope", "global")
    if scope not in {"meeting_only", "global"}:
        scope = "global"

    if meeting_id is None:
        scope = "global"

    return intent, scope


def _embed_question(question: str) -> list[float]:
    client = get_openai_client()
    response = client.embeddings.create(model=settings.embedding_model, input=[question])
    return response.data[0].embedding


def _build_query_filter(*, meeting_id: int | None, scope: str) -> qdrant_models.Filter | None:
    if scope == "meeting_only" and meeting_id is not None:
        return qdrant_models.Filter(
            must=[
                qdrant_models.FieldCondition(
                    key="meeting_id",
                    match=qdrant_models.MatchValue(value=meeting_id),
                )
            ]
        )
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

    scored: list[ScoredHit] = []
    used_source_type_count: dict[str, int] = {}
    used_source_id_count: dict[int, int] = {}

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
    meeting_id: int | None,
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


def build_answer(
    session: Session,
    *,
    meeting_id: int | None,
    user_id: int,
    question: str,
    intent: str,
    scope: str,
    citations: list[Citation],
    context_blocks: list[str],
    related_sources: list[dict],
    started_at: float,
) -> AnswerResult:
    """Generate an LLM answer from retrieved context blocks and persist the log."""
    history_key = meeting_id if meeting_id is not None else 0
    history_messages = get_history(user_id, history_key)

    if not context_blocks:
        fallback = "該当する資料から回答の根拠を見つけられませんでした。質問を具体化して再度お試しください。"
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
        append_history(user_id, history_key, question, fallback)
        return AnswerResult(
            intent=intent,
            scope=scope,
            answer=fallback,
            model_name=settings.llm_model,
            confidence=0.0,
            citations=[],
            related_sources=related_sources,
        )

    logger.debug(f"[build_answer] Calling LLM for answer - model={settings.llm_model}, context_blocks={len(context_blocks)}, citations={len(citations)}")
    meeting_context_line = f"会議ID: {meeting_id}\n" if meeting_id is not None else ""
    llm_start = perf_counter()
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
            *history_messages,
            {
                "role": "user",
                "content": (
                    f"{meeting_context_line}"
                    f"質問: {question}\n\n"
                    "以下のコンテキストを根拠に回答してください。"
                    "文末に参照番号を [1], [2] の形式で示してください。\n\n"
                    + "\n\n".join(context_blocks)
                ),
            },
        ],
    )

    answer = (response.choices[0].message.content or "").strip() or "回答を生成できませんでした。"
    logger.debug(f"[build_answer] LLM responded - latency={int((perf_counter() - llm_start) * 1000)}ms, answer_length={len(answer)}")
    usage = response.usage
    _save_qa_log(
        session,
        meeting_id=meeting_id,
        user_id=user_id,
        question=question,
        answer=answer,
        citations=citations,
        model_name=settings.llm_model,
        prompt_tokens=usage.prompt_tokens if usage else None,
        completion_tokens=usage.completion_tokens if usage else None,
        total_tokens=usage.total_tokens if usage else None,
        latency_ms=int((perf_counter() - started_at) * 1000),
    )
    session.commit()
    append_history(user_id, history_key, question, answer)

    confidence = 0.0
    if citations:
        confidence = min(1.0, sum(max(0.0, c.score) for c in citations[:5]) / max(1, min(len(citations), 5)))

    return AnswerResult(
        intent=intent,
        scope=scope,
        answer=answer,
        model_name=settings.llm_model,
        confidence=confidence,
        citations=citations,
        related_sources=related_sources,
    )
