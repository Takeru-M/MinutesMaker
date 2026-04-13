from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from hashlib import sha256
import logging
from uuid import uuid4

from sqlmodel import Session, select

from app.core.config import settings
from app.crud.meeting_knowledge import (
    create_chunk,
    create_source,
    delete_chunks_by_source_id,
    get_source_by_entity,
    list_chunks_by_source_id,
    update_source,
)
from app.models.agenda import Agenda
from app.models.content import Content, ContentAttachment
from app.models.meeting import Meeting
from app.models.meeting_knowledge import MeetingKnowledgeChunk, MeetingKnowledgeSource
from app.models.minutes import Minutes
from app.models.notice import Notice
from app.services.rag.clients import get_collection_name, get_openai_client, get_qdrant_client
from app.services.rag.pdf_loader import load_pdf_text_from_s3
from app.services.rag.text_splitter import split_text


logger = logging.getLogger(__name__)


@dataclass
class SourceDocument:
    source_type: str
    source_entity_id: int
    source_label: str
    text: str
    source_uri: str | None = None
    source_updated_at: datetime | None = None


@dataclass
class IngestResult:
    meeting_id: int
    indexed_sources: int
    indexed_chunks: int
    skipped_sources: int


def ingest_meeting_knowledge(session: Session, meeting_id: int) -> IngestResult:
    meeting = session.exec(select(Meeting).where(Meeting.id == meeting_id)).first()
    if meeting is None:
        raise ValueError("Meeting not found")

    documents = _collect_meeting_documents(session, meeting)
    if not documents:
        return IngestResult(meeting_id=meeting_id, indexed_sources=0, indexed_chunks=0, skipped_sources=0)

    _ensure_collection()

    indexed_sources = 0
    indexed_chunks = 0
    skipped_sources = 0

    for document in documents:
        source, changed = _upsert_source(session, meeting_id=meeting_id, document=document)
        if not changed:
            skipped_sources += 1
            continue

        chunks = split_text(
            document.text,
            chunk_size=settings.rag_chunk_size,
            chunk_overlap=settings.rag_chunk_overlap,
        )
        if not chunks:
            skipped_sources += 1
            continue

        _replace_source_chunks(
            session,
            meeting_id=meeting_id,
            source=source,
            source_type=document.source_type,
            source_entity_id=document.source_entity_id,
            chunks=chunks,
        )

        indexed_sources += 1
        indexed_chunks += len(chunks)

    session.commit()

    return IngestResult(
        meeting_id=meeting_id,
        indexed_sources=indexed_sources,
        indexed_chunks=indexed_chunks,
        skipped_sources=skipped_sources,
    )


def _collect_meeting_documents(session: Session, meeting: Meeting) -> list[SourceDocument]:
    documents: list[SourceDocument] = []

    meeting_text = "\n".join(
        [
            f"Meeting Title: {meeting.title}",
            f"Description: {meeting.description or ''}",
            f"Location: {meeting.location or ''}",
            f"Meeting Type: {meeting.meeting_type}",
            f"Meeting Scale: {meeting.meeting_scale}",
            f"Scheduled At: {meeting.scheduled_at.isoformat()}",
        ]
    ).strip()
    if meeting.id is not None and meeting_text:
        documents.append(
            SourceDocument(
                source_type="meeting",
                source_entity_id=meeting.id,
                source_label=meeting.title,
                text=meeting_text,
                source_uri=f"meeting:{meeting.id}",
                source_updated_at=meeting.updated_at,
            )
        )

    agendas = session.exec(
        select(Agenda)
        .where(Agenda.meeting_id == meeting.id, Agenda.deleted_at.is_(None), Agenda.is_active.is_(True))
        .order_by(Agenda.order_no.asc(), Agenda.id.asc())
    ).all()

    for agenda in agendas:
        if agenda.id is None:
            continue

        agenda_text = "\n".join(
            [
                f"Agenda Title: {agenda.title}",
                f"Responsible: {agenda.responsible or ''}",
                f"Description: {agenda.description or ''}",
                f"Content: {agenda.content or ''}",
                f"Voting Items: {agenda.voting_items or ''}",
                f"Priority: {agenda.priority}",
                f"Order: {agenda.order_no}",
            ]
        ).strip()
        if agenda_text:
            documents.append(
                SourceDocument(
                    source_type="agenda",
                    source_entity_id=agenda.id,
                    source_label=agenda.title,
                    text=agenda_text,
                    source_uri=f"agenda:{agenda.id}",
                    source_updated_at=agenda.updated_at,
                )
            )

        if agenda.pdf_s3_key:
            documents.extend(
                _load_pdf_documents(
                    source_type="agenda",
                    source_entity_id=agenda.id,
                    source_label=agenda.title,
                    s3_key=agenda.pdf_s3_key,
                    base_uri=f"agenda:{agenda.id}",
                )
            )

    minutes_list = session.exec(
        select(Minutes)
        .where(Minutes.meeting_id == meeting.id, Minutes.deleted_at.is_(None))
        .order_by(Minutes.created_at.asc(), Minutes.id.asc())
    ).all()

    for minute in minutes_list:
        if minute.id is None:
            continue

        minute_text = "\n".join(
            [
                f"Minutes Title: {minute.title}",
                f"Scope Type: {minute.scope_type}",
                f"Agenda ID: {minute.agenda_id or ''}",
                f"Body: {minute.body or ''}",
                f"Content Type: {minute.content_type}",
                f"PDF URL: {minute.pdf_url or ''}",
            ]
        ).strip()
        if minute_text:
            documents.append(
                SourceDocument(
                    source_type="minutes",
                    source_entity_id=minute.id,
                    source_label=minute.title,
                    text=minute_text,
                    source_uri=f"minutes:{minute.id}",
                    source_updated_at=minute.updated_at,
                )
            )

        if minute.pdf_s3_key:
            documents.extend(
                _load_pdf_documents(
                    source_type="minutes",
                    source_entity_id=minute.id,
                    source_label=minute.title,
                    s3_key=minute.pdf_s3_key,
                    base_uri=f"minutes:{minute.id}",
                )
            )

    contents = session.exec(
        select(Content)
        .where(Content.status == "published", Content.deleted_at.is_(None))
        .order_by(Content.created_at.desc())
        .limit(200)
    ).all()

    for content in contents:
        if content.id is None:
            continue

        content_text = "\n".join(
            [
                f"Content Type: {content.content_type}",
                f"Title: {content.title}",
                f"Body: {content.content or ''}",
            ]
        ).strip()
        if content_text:
            documents.append(
                SourceDocument(
                    source_type="content",
                    source_entity_id=content.id,
                    source_label=content.title,
                    text=content_text,
                    source_uri=f"content:{content.id}",
                    source_updated_at=content.updated_at,
                )
            )

    attachments = session.exec(
        select(ContentAttachment)
        .join(Content, ContentAttachment.content_id == Content.id)
        .where(Content.status == "published", Content.deleted_at.is_(None))
        .order_by(ContentAttachment.updated_at.desc())
        .limit(300)
    ).all()

    for attachment in attachments:
        if attachment.id is None:
            continue
        if attachment.mime_type.lower() != "application/pdf":
            continue

        documents.extend(
            _load_pdf_documents(
                source_type="content_attachment",
                source_entity_id=attachment.id,
                source_label=attachment.file_name,
                s3_key=attachment.s3_key,
                base_uri=f"content_attachment:{attachment.id}",
            )
        )

    notices = session.exec(
        select(Notice)
        .where(Notice.status == "published", Notice.deleted_at.is_(None))
        .order_by(Notice.published_at.desc(), Notice.created_at.desc())
        .limit(200)
    ).all()

    for notice in notices:
        if notice.id is None:
            continue

        notice_text = "\n".join(
            [
                f"Category: {notice.category}",
                f"Title: {notice.title}",
                f"Body: {notice.content or ''}",
            ]
        ).strip()
        if not notice_text:
            continue

        documents.append(
            SourceDocument(
                source_type="notice",
                source_entity_id=notice.id,
                source_label=notice.title,
                text=notice_text,
                source_uri=f"notice:{notice.id}",
                source_updated_at=notice.updated_at,
            )
        )

    return documents


def _load_pdf_documents(
    *,
    source_type: str,
    source_entity_id: int,
    source_label: str,
    s3_key: str,
    base_uri: str,
) -> list[SourceDocument]:
    try:
        pdf_result = load_pdf_text_from_s3(s3_key)
    except Exception as exc:
        logger.warning("Failed to extract PDF text for %s:%s (%s): %s", source_type, source_entity_id, s3_key, exc)
        return []

    if not pdf_result.text:
        return []

    return [
        SourceDocument(
            source_type=source_type,
            source_entity_id=source_entity_id,
            source_label=f"{source_label} (PDF)",
            text=pdf_result.text,
            source_uri=f"{base_uri}:pdf:{s3_key}",
            source_updated_at=None,
        )
    ]


def _upsert_source(
    session: Session,
    *,
    meeting_id: int,
    document: SourceDocument,
) -> tuple[MeetingKnowledgeSource, bool]:
    content_hash = sha256(document.text.encode("utf-8")).hexdigest()
    source = get_source_by_entity(
        session,
        meeting_id=meeting_id,
        source_type=document.source_type,
        source_entity_id=document.source_entity_id,
        version_tag="latest",
    )

    if source is None:
        source = MeetingKnowledgeSource(
            meeting_id=meeting_id,
            source_type=document.source_type,
            source_entity_id=document.source_entity_id,
            source_label=document.source_label,
            source_uri=document.source_uri,
            version_tag="latest",
            content_hash=content_hash,
            last_synced_at=datetime.utcnow(),
        )
        create_source(session, source)
        return source, True

    if source.content_hash == content_hash:
        return source, False

    source.source_label = document.source_label
    source.source_uri = document.source_uri
    source.content_hash = content_hash
    source.last_synced_at = datetime.utcnow()
    update_source(session, source)
    return source, True


def _replace_source_chunks(
    session: Session,
    *,
    meeting_id: int,
    source: MeetingKnowledgeSource,
    source_type: str,
    source_entity_id: int,
    chunks: list[str],
) -> None:
    source_id = source.id
    if source_id is None:
        raise ValueError("Source not persisted")

    qdrant = get_qdrant_client()
    collection_name = get_collection_name()

    existing_chunks = list_chunks_by_source_id(session, source_id)
    existing_vector_ids = [chunk.embedding_vector_id for chunk in existing_chunks if chunk.embedding_vector_id]
    if existing_vector_ids:
        qdrant.delete(collection_name=collection_name, points_selector={"points": existing_vector_ids})

    delete_chunks_by_source_id(session, source_id)

    vectors = _embed_texts(chunks)
    points: list[dict] = []

    for idx, (chunk_text, vector) in enumerate(zip(chunks, vectors, strict=False)):
        vector_id = str(uuid4())
        chunk = MeetingKnowledgeChunk(
            meeting_id=meeting_id,
            source_id=source_id,
            chunk_index=idx,
            chunk_text=chunk_text,
            token_count=_approx_token_count(chunk_text),
            embedding_model=settings.embedding_model,
            embedding_vector_id=vector_id,
            metadata_json={
                "meeting_id": meeting_id,
                "source_type": source_type,
                "source_entity_id": source_entity_id,
                "chunk_index": idx,
            },
        )
        create_chunk(session, chunk)

        if chunk.id is None:
            raise ValueError("Chunk not persisted")

        points.append(
            {
                "id": vector_id,
                "vector": vector,
                "payload": {
                    "meeting_id": meeting_id,
                    "source_id": source_id,
                    "chunk_id": chunk.id,
                    "source_type": source_type,
                    "source_entity_id": source_entity_id,
                    "chunk_index": idx,
                },
            }
        )

    if points:
        qdrant.upsert(collection_name=collection_name, points=points, wait=True)


def _ensure_collection() -> None:
    qdrant = get_qdrant_client()
    collection_name = get_collection_name()

    if qdrant.collection_exists(collection_name):
        return

    probe_vector = _embed_texts(["collection probe"])[0]
    vector_size = len(probe_vector)
    qdrant.create_collection(
        collection_name=collection_name,
        vectors_config={"size": vector_size, "distance": "Cosine"},
    )


def _embed_texts(texts: list[str]) -> list[list[float]]:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not configured")

    client = get_openai_client()
    response = client.embeddings.create(model=settings.embedding_model, input=texts)
    return [item.embedding for item in response.data]


def _approx_token_count(text: str) -> int:
    # A lightweight approximation to avoid tokenizer dependency in ingestion hot path.
    return max(1, len(text) // 4)
