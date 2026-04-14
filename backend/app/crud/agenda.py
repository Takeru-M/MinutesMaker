from datetime import date, datetime, time

from sqlalchemy import func
from sqlmodel import Session, select

from app.core.constants import (
    MEETING_TYPE_ANNUAL,
    MEETING_TYPE_BLOCK,
    MEETING_TYPE_LARGE,
    RELATION_TYPE_OTHER_REFERENCE,
    RELATION_TYPE_PAST_BLOCK,
)
from app.models.agenda import Agenda
from app.models.agenda_relation import AgendaRelation
from app.models.meeting import Meeting
from app.schemas.agenda import AgendaCreateRequest, AgendaUpdateRequest
from app.services.s3_storage import build_public_s3_url


def list_agendas(db: Session, *, sort_order: str = "default") -> list[tuple[Agenda, Meeting]]:
    stmt = select(Agenda, Meeting).join(Meeting, Agenda.meeting_id == Meeting.id).where(
        Agenda.deleted_at.is_(None),
        Agenda.is_active.is_(True),
    )
    if sort_order == "newest":
        stmt = stmt.order_by(Agenda.created_at.desc(), Agenda.id.desc())
    else:
        stmt = stmt.order_by(Agenda.meeting_id, Agenda.order_no)
    return list(db.exec(stmt).all())


def search_agendas(
    db: Session,
    *,
    query: str,
    meeting_type: str | None,
    limit: int,
) -> list[tuple[Agenda, Meeting]]:
    stmt = select(Agenda, Meeting).join(Meeting, Agenda.meeting_id == Meeting.id).where(
        Agenda.deleted_at.is_(None),
        Agenda.is_active.is_(True),
    )
    if query:
        stmt = stmt.where(Agenda.title.ilike(f"%{query}%"))
    if meeting_type:
        stmt = stmt.where(Meeting.meeting_type == meeting_type)

    stmt = stmt.order_by(Meeting.scheduled_at.desc(), Agenda.created_at.desc()).limit(limit)
    return list(db.exec(stmt).all())


def get_agenda_by_id(db: Session, agenda_id: int) -> Agenda | None:
    stmt = select(Agenda).where(Agenda.id == agenda_id, Agenda.deleted_at.is_(None), Agenda.is_active.is_(True))
    return db.exec(stmt).first()


def get_related_agenda_ids(db: Session, *, agenda_id: int, relation_type: str) -> list[int]:
    stmt = (
        select(AgendaRelation.target_agenda_id)
        .where(AgendaRelation.source_agenda_id == agenda_id, AgendaRelation.relation_type == relation_type)
        .order_by(AgendaRelation.target_agenda_id.asc())
    )
    return [row for row in db.exec(stmt).all()]


def create_agenda(db: Session, *, payload: AgendaCreateRequest, user_id: int) -> Agenda:
    meeting = _get_or_create_meeting(db, payload=payload, user_id=user_id)
    if meeting.id is None:
        raise ValueError("Meeting was not persisted")

    order_no = _next_order_no(db, meeting_id=meeting.id)

    normalized_pdf_url = payload.pdf_url
    if payload.pdf_s3_key:
        try:
            normalized_pdf_url = build_public_s3_url(s3_key=payload.pdf_s3_key)
        except ValueError:
            normalized_pdf_url = payload.pdf_url

    agenda = Agenda(
        meeting_id=meeting.id,
        meeting_date=meeting.scheduled_at.date(),
        meeting_type=meeting.meeting_type,
        title=payload.title,
        responsible=payload.responsible or payload.description,
        description=payload.description,
        content=payload.content,
        status=payload.status,
        priority=payload.priority,
        agenda_types=payload.agenda_types,
        voting_items=payload.voting_items,
        pdf_s3_key=payload.pdf_s3_key,
        pdf_url=normalized_pdf_url,
        order_no=order_no,
        created_by=user_id,
        updated_by=user_id,
    )
    db.add(agenda)
    db.flush()

    if agenda.id is None:
        raise ValueError("Agenda was not persisted")

    _create_agenda_relations(
        db,
        source_agenda_id=agenda.id,
        target_ids=payload.related_past_agenda_ids,
        relation_type=RELATION_TYPE_PAST_BLOCK,
    )
    _create_agenda_relations(
        db,
        source_agenda_id=agenda.id,
        target_ids=payload.related_other_agenda_ids,
        relation_type=RELATION_TYPE_OTHER_REFERENCE,
    )

    db.commit()
    db.refresh(agenda)
    return agenda


def update_agenda(db: Session, *, agenda_id: int, payload: AgendaUpdateRequest, user_id: int) -> Agenda | None:
    agenda = db.exec(select(Agenda).where(Agenda.id == agenda_id, Agenda.deleted_at.is_(None))).first()
    if agenda is None:
        return None

    meeting = _get_or_create_meeting(db, payload=payload, user_id=user_id)
    if meeting.id is None:
        raise ValueError("Meeting was not persisted")

    target_meeting_id = meeting.id
    meeting_changed = agenda.meeting_id != target_meeting_id

    normalized_pdf_url = payload.pdf_url
    if payload.pdf_s3_key:
        try:
            normalized_pdf_url = build_public_s3_url(s3_key=payload.pdf_s3_key)
        except ValueError:
            normalized_pdf_url = payload.pdf_url

    agenda.title = payload.title
    agenda.responsible = payload.responsible
    agenda.description = payload.description
    agenda.content = payload.content
    agenda.status = payload.status
    agenda.priority = payload.priority
    agenda.agenda_types = payload.agenda_types
    agenda.voting_items = payload.voting_items
    agenda.pdf_s3_key = payload.pdf_s3_key
    agenda.pdf_url = normalized_pdf_url
    agenda.meeting_id = target_meeting_id
    agenda.meeting_date = meeting.scheduled_at.date()
    agenda.meeting_type = meeting.meeting_type
    if meeting_changed:
        agenda.order_no = _next_order_no(db, meeting_id=target_meeting_id)
    agenda.updated_by = user_id
    agenda.updated_at = datetime.utcnow()

    existing_relations = db.exec(select(AgendaRelation).where(AgendaRelation.source_agenda_id == agenda_id)).all()
    for relation in existing_relations:
        db.delete(relation)

    db.add(agenda)
    db.flush()

    _create_agenda_relations(
        db,
        source_agenda_id=agenda.id or agenda_id,
        target_ids=payload.related_past_agenda_ids,
        relation_type=RELATION_TYPE_PAST_BLOCK,
    )
    _create_agenda_relations(
        db,
        source_agenda_id=agenda.id or agenda_id,
        target_ids=payload.related_other_agenda_ids,
        relation_type=RELATION_TYPE_OTHER_REFERENCE,
    )

    db.commit()
    db.refresh(agenda)
    return agenda


def delete_agenda(db: Session, *, agenda_id: int) -> bool:
    agenda = db.exec(select(Agenda).where(Agenda.id == agenda_id, Agenda.deleted_at.is_(None))).first()
    if agenda is None:
        return False

    for relation in list(
        db.exec(
            select(AgendaRelation).where(
                (AgendaRelation.source_agenda_id == agenda_id) | (AgendaRelation.target_agenda_id == agenda_id)
            )
        ).all()
    ):
        db.delete(relation)

    agenda.is_active = False
    agenda.deleted_at = datetime.utcnow()
    agenda.updated_at = datetime.utcnow()
    db.add(agenda)
    db.commit()
    return True


def _next_order_no(db: Session, *, meeting_id: int) -> int:
    current_max = db.exec(
        select(func.max(Agenda.order_no)).where(Agenda.meeting_id == meeting_id)
    ).one()
    return (current_max or 0) + 1


def _get_or_create_meeting(db: Session, *, payload: AgendaCreateRequest, user_id: int) -> Meeting:
    scheduled_at = datetime.combine(payload.meeting_date, time(hour=18, minute=0))
    meeting = db.exec(
        select(Meeting).where(
            func.date(Meeting.scheduled_at) == payload.meeting_date,
            Meeting.meeting_type == payload.meeting_type,
        )
    ).first()
    if meeting is not None:
        return meeting

    meeting = Meeting(
        title=_build_meeting_title(payload.meeting_date, payload.meeting_type),
        description="Agenda submission generated meeting",
        scheduled_at=scheduled_at,
        location="大会議室" if payload.meeting_type == MEETING_TYPE_LARGE else "中会議室",
        status="scheduled",
        meeting_type=payload.meeting_type,
        meeting_scale="large" if payload.meeting_type == MEETING_TYPE_LARGE else "small",
        minutes_scope_policy="agenda",
        created_by=user_id,
    )
    db.add(meeting)
    db.flush()
    return meeting


def _build_meeting_title(meeting_date: date, meeting_type: str) -> str:
    labels = {
        MEETING_TYPE_LARGE: "大規模",
        MEETING_TYPE_BLOCK: "ブロック",
        MEETING_TYPE_ANNUAL: "年次",
    }
    return f"{meeting_date.month}月{meeting_date.day}日の{labels.get(meeting_type, '会議')}会議"


def _create_agenda_relations(
    db: Session,
    *,
    source_agenda_id: int,
    target_ids: list[int],
    relation_type: str,
) -> None:
    target_ids_unique = {target_id for target_id in target_ids if target_id != source_agenda_id}
    if not target_ids_unique:
        return

    existing_relations = db.exec(
        select(AgendaRelation).where(
            AgendaRelation.source_agenda_id == source_agenda_id,
            AgendaRelation.relation_type == relation_type,
        )
    ).all()
    existing_target_ids = {relation.target_agenda_id for relation in existing_relations}

    for target_id in target_ids_unique:
        if target_id not in existing_target_ids:
            db.add(
                AgendaRelation(
                    source_agenda_id=source_agenda_id,
                    target_agenda_id=target_id,
                    relation_type=relation_type,
                )
            )
