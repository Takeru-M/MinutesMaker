from datetime import date, datetime, time, timedelta

from sqlmodel import Session, select

from app.models.agenda import Agenda
from app.models.meeting import Meeting
from app.schemas.meeting import MeetingCreateRequest, MeetingUpdateRequest


def _meeting_policy_attributes(meeting_type: str) -> tuple[str, str]:
    if meeting_type in {"dormitory_general_assembly", "block", "annual"}:
        return "large", "agenda"
    return "small", "meeting"


def list_meetings(
    db: Session,
    *,
    date_filter: date | None,
    host: str,
    title: str,
    limit: int,
) -> list[Meeting]:
    stmt = select(Meeting)

    normalized_host = host.strip()
    normalized_title = title.strip()

    if date_filter is not None:
        start_at = datetime.combine(date_filter, time.min)
        end_at = start_at + timedelta(days=1)
        stmt = stmt.where(Meeting.scheduled_at >= start_at, Meeting.scheduled_at < end_at)

    if normalized_title:
        stmt = stmt.where(Meeting.title.ilike(f"%{normalized_title}%"))

    if normalized_host:
        stmt = stmt.where(
            Meeting.title.ilike(f"%{normalized_host}%")
            | Meeting.description.ilike(f"%{normalized_host}%")
            | Meeting.location.ilike(f"%{normalized_host}%")
            | Meeting.meeting_type.ilike(f"%{normalized_host}%")
        )

    stmt = stmt.order_by(Meeting.scheduled_at.desc(), Meeting.id.desc()).limit(limit)
    return list(db.exec(stmt).all())


def get_meeting_by_id(db: Session, meeting_id: int) -> Meeting | None:
    stmt = select(Meeting).where(Meeting.id == meeting_id)
    return db.exec(stmt).first()


def create_meeting(db: Session, *, payload: MeetingCreateRequest, user_id: int) -> Meeting:
    meeting_scale, minutes_scope_policy = _meeting_policy_attributes(payload.meeting_type)
    meeting = Meeting(
        title=payload.title,
        description=payload.description,
        scheduled_at=payload.scheduled_at,
        location=payload.location,
        status=payload.status,
        meeting_type=payload.meeting_type,
        meeting_scale=meeting_scale,
        minutes_scope_policy=minutes_scope_policy,
        created_by=user_id,
    )
    db.add(meeting)
    db.flush()
    db.commit()
    db.refresh(meeting)
    return meeting


def update_meeting(db: Session, *, meeting_id: int, payload: MeetingUpdateRequest) -> Meeting | None:
    meeting = get_meeting_by_id(db, meeting_id)
    if meeting is None:
        return None

    meeting_scale, minutes_scope_policy = _meeting_policy_attributes(payload.meeting_type)
    meeting.title = payload.title
    meeting.description = payload.description
    meeting.scheduled_at = payload.scheduled_at
    meeting.location = payload.location
    meeting.status = payload.status
    meeting.meeting_type = payload.meeting_type
    meeting.meeting_scale = meeting_scale
    meeting.minutes_scope_policy = minutes_scope_policy
    meeting.updated_at = datetime.utcnow()

    related_agendas = list(db.exec(select(Agenda).where(Agenda.meeting_id == meeting_id)).all())
    for agenda in related_agendas:
        agenda.meeting_date = payload.scheduled_at.date()
        agenda.meeting_type = payload.meeting_type
        agenda.updated_at = datetime.utcnow()
        db.add(agenda)

    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


def delete_meeting(db: Session, *, meeting_id: int) -> bool:
    meeting = get_meeting_by_id(db, meeting_id)
    if meeting is None:
        return False

    has_agendas = db.exec(select(Agenda.id).where(Agenda.meeting_id == meeting_id)).first() is not None
    if has_agendas:
        raise ValueError("Meeting has agendas and cannot be deleted")

    db.delete(meeting)
    db.commit()
    return True


def list_agendas_by_meeting_id(db: Session, meeting_id: int) -> list[Agenda]:
    stmt = (
        select(Agenda)
        .where(Agenda.meeting_id == meeting_id, Agenda.deleted_at.is_(None), Agenda.is_active.is_(True))
        .order_by(Agenda.order_no.asc(), Agenda.id.asc())
    )
    return list(db.exec(stmt).all())
