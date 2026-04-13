from datetime import datetime
from typing import Optional

from sqlalchemy import and_
from sqlmodel import Session, func, select

from app.models.minutes import Minutes


def create_minute(session: Session, minute: Minutes) -> Minutes:
    """Create a new minute record."""
    session.add(minute)
    session.commit()
    session.refresh(minute)
    return minute


def get_minute_by_id(session: Session, minute_id: int) -> Optional[Minutes]:
    """Get a minute record by ID."""
    stmt = select(Minutes).where(
        and_(
            Minutes.id == minute_id,
            Minutes.deleted_at.is_(None),
        )
    )
    return session.exec(stmt).first()


def list_minutes_by_agenda_id(
    session: Session,
    agenda_id: int,
    skip: int = 0,
    limit: int = 100,
) -> list[Minutes]:
    """List all minutes for a specific agenda."""
    stmt = (
        select(Minutes)
        .where(
            and_(
                Minutes.agenda_id == agenda_id,
                Minutes.scope_type == "agenda",
                Minutes.deleted_at.is_(None),
            )
        )
        .order_by(Minutes.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return session.exec(stmt).all()


def count_minutes_by_agenda_id(session: Session, agenda_id: int) -> int:
    """Count all minutes for a specific agenda."""
    stmt = select(func.count(Minutes.id)).where(
        and_(
            Minutes.agenda_id == agenda_id,
            Minutes.scope_type == "agenda",
            Minutes.deleted_at.is_(None),
        )
    )
    return session.exec(stmt).one()


def list_minutes_by_meeting_id(
    session: Session,
    meeting_id: int,
    skip: int = 0,
    limit: int = 100,
) -> list[Minutes]:
    """List all minutes for a specific meeting."""
    stmt = (
        select(Minutes)
        .where(
            and_(
                Minutes.meeting_id == meeting_id,
                Minutes.scope_type == "meeting",
                Minutes.deleted_at.is_(None),
            )
        )
        .order_by(Minutes.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return session.exec(stmt).all()


def count_minutes_by_meeting_id(session: Session, meeting_id: int) -> int:
    """Count all minutes for a specific meeting."""
    stmt = select(func.count(Minutes.id)).where(
        and_(
            Minutes.meeting_id == meeting_id,
            Minutes.scope_type == "meeting",
            Minutes.deleted_at.is_(None),
        )
    )
    return session.exec(stmt).one()


def update_minute(session: Session, minute: Minutes) -> Minutes:
    """Update a minute record."""
    minute.updated_at = datetime.utcnow()
    session.add(minute)
    session.commit()
    session.refresh(minute)
    return minute


def delete_minute(session: Session, minute_id: int) -> bool:
    """Soft delete a minute record."""
    minute = get_minute_by_id(session, minute_id)
    if not minute:
        return False
    minute.deleted_at = datetime.utcnow()
    session.add(minute)
    session.commit()
    return True
