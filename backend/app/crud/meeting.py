from datetime import date, datetime, time, timedelta

from sqlmodel import Session, select

from app.models.agenda import Agenda
from app.models.meeting import Meeting


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


def list_agendas_by_meeting_id(db: Session, meeting_id: int) -> list[Agenda]:
    stmt = (
        select(Agenda)
        .where(Agenda.meeting_id == meeting_id, Agenda.deleted_at.is_(None), Agenda.is_active.is_(True))
        .order_by(Agenda.order_no.asc(), Agenda.id.asc())
    )
    return list(db.exec(stmt).all())
