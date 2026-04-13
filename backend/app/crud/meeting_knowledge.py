from datetime import datetime

from sqlmodel import Session, select

from app.models.meeting_knowledge import MeetingKnowledgeChunk, MeetingKnowledgeSource, MeetingQALog


def get_source_by_entity(
    session: Session,
    *,
    meeting_id: int,
    source_type: str,
    source_entity_id: int,
    version_tag: str = "latest",
) -> MeetingKnowledgeSource | None:
    stmt = select(MeetingKnowledgeSource).where(
        MeetingKnowledgeSource.meeting_id == meeting_id,
        MeetingKnowledgeSource.source_type == source_type,
        MeetingKnowledgeSource.source_entity_id == source_entity_id,
        MeetingKnowledgeSource.version_tag == version_tag,
    )
    return session.exec(stmt).first()


def create_source(session: Session, source: MeetingKnowledgeSource) -> MeetingKnowledgeSource:
    session.add(source)
    session.flush()
    return source


def update_source(session: Session, source: MeetingKnowledgeSource) -> MeetingKnowledgeSource:
    source.updated_at = datetime.utcnow()
    session.add(source)
    session.flush()
    return source


def list_chunks_by_source_id(session: Session, source_id: int) -> list[MeetingKnowledgeChunk]:
    stmt = (
        select(MeetingKnowledgeChunk)
        .where(MeetingKnowledgeChunk.source_id == source_id)
        .order_by(MeetingKnowledgeChunk.chunk_index.asc())
    )
    return list(session.exec(stmt).all())


def list_chunks_by_ids(session: Session, chunk_ids: list[int]) -> list[MeetingKnowledgeChunk]:
    if not chunk_ids:
        return []

    stmt = select(MeetingKnowledgeChunk).where(MeetingKnowledgeChunk.id.in_(chunk_ids))
    rows = list(session.exec(stmt).all())
    by_id = {row.id: row for row in rows if row.id is not None}
    return [by_id[chunk_id] for chunk_id in chunk_ids if chunk_id in by_id]


def delete_chunks_by_source_id(session: Session, source_id: int) -> None:
    for chunk in list_chunks_by_source_id(session, source_id):
        session.delete(chunk)
    session.flush()


def create_chunk(session: Session, chunk: MeetingKnowledgeChunk) -> MeetingKnowledgeChunk:
    session.add(chunk)
    session.flush()
    return chunk


def create_qa_log(session: Session, qa_log: MeetingQALog) -> MeetingQALog:
    session.add(qa_log)
    session.flush()
    return qa_log


def list_sources_by_ids(session: Session, source_ids: list[int]) -> list[MeetingKnowledgeSource]:
    if not source_ids:
        return []

    stmt = select(MeetingKnowledgeSource).where(MeetingKnowledgeSource.id.in_(source_ids))
    rows = list(session.exec(stmt).all())
    by_id = {row.id: row for row in rows if row.id is not None}
    return [by_id[source_id] for source_id in source_ids if source_id in by_id]
