from datetime import date, datetime, time, timedelta

from sqlalchemy import func
from sqlmodel import Session, select

from app.models.notice import Notice
from app.models.user import User


def list_notices(
    db: Session,
    *,
    date_filter: date | None,
    source: str,
    title: str,
    limit: int,
) -> list[Notice]:
    stmt = select(Notice).where(Notice.deleted_at.is_(None), Notice.status == "published")

    normalized_source = source.strip()
    normalized_title = title.strip()

    if date_filter is not None:
        start_at = datetime.combine(date_filter, time.min)
        end_at = start_at + timedelta(days=1)
        stmt = stmt.where(
            func.coalesce(Notice.published_at, Notice.created_at) >= start_at,
            func.coalesce(Notice.published_at, Notice.created_at) < end_at,
        )

    if normalized_title:
        stmt = stmt.where(Notice.title.ilike(f"%{normalized_title}%"))

    if normalized_source:
        stmt = stmt.where(Notice.category.ilike(f"%{normalized_source}%"))

    stmt = stmt.order_by(
        Notice.is_pinned.desc(),
        func.coalesce(Notice.published_at, Notice.created_at).desc(),
        Notice.id.desc(),
    ).limit(limit)

    return list(db.exec(stmt).all())


def get_notice_by_id(db: Session, notice_id: int) -> Notice | None:
    stmt = select(Notice).where(
        Notice.id == notice_id,
        Notice.deleted_at.is_(None),
        Notice.status == "published",
    )
    return db.exec(stmt).first()


def get_notice_detail_with_user(db: Session, notice_id: int) -> dict | None:
    """Notice詳細をユーザー情報と共に取得"""
    stmt = select(Notice, User).join(User, Notice.created_by == User.id).where(
        Notice.id == notice_id,
        Notice.deleted_at.is_(None),
        Notice.status == "published",
    )
    result = db.exec(stmt).first()
    if result is None:
        return None
    
    notice, user = result
    return {
        "id": notice.id,
        "title": notice.title,
        "content": notice.content,
        "category": notice.category,
        "created_by_name": user.username,
        "published_at": notice.published_at,
    }
