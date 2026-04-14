from datetime import date, datetime, time, timedelta

from sqlalchemy import func
from sqlmodel import Session, select

from app.models.notice import Notice
from app.models.user import User
from app.schemas.notice import NoticeCreateRequest, NoticeUpdateRequest


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


def list_admin_notices(
    db: Session,
    *,
    category: str = "",
    status: str = "",
    title: str = "",
    is_pinned: bool | None = None,
    limit: int = 200,
) -> list[Notice]:
    stmt = select(Notice).where(Notice.deleted_at.is_(None))

    normalized_category = category.strip()
    normalized_status = status.strip()
    normalized_title = title.strip()

    if normalized_category:
        stmt = stmt.where(Notice.category == normalized_category)

    if normalized_status:
        stmt = stmt.where(Notice.status == normalized_status)

    if normalized_title:
        stmt = stmt.where(Notice.title.ilike(f"%{normalized_title}%"))

    if is_pinned is not None:
        stmt = stmt.where(Notice.is_pinned.is_(is_pinned))

    stmt = stmt.order_by(
        Notice.is_pinned.desc(),
        func.coalesce(Notice.published_at, Notice.created_at).desc(),
        Notice.updated_at.desc(),
        Notice.id.desc(),
    ).limit(limit)

    return list(db.exec(stmt).all())


def get_admin_notice_by_id(db: Session, notice_id: int) -> Notice | None:
    stmt = select(Notice).where(Notice.id == notice_id, Notice.deleted_at.is_(None))
    return db.exec(stmt).first()


def create_notice(db: Session, *, payload: NoticeCreateRequest, user_id: int) -> Notice:
    published_at = payload.published_at
    if payload.status == "published" and published_at is None:
        published_at = datetime.utcnow()

    notice = Notice(
        title=payload.title,
        content=payload.content,
        status=payload.status,
        category=payload.category,
        is_pinned=payload.is_pinned,
        created_by=user_id,
        updated_by=user_id,
        published_at=published_at,
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return notice


def update_notice(db: Session, *, notice_id: int, payload: NoticeUpdateRequest, user_id: int) -> Notice | None:
    notice = db.exec(select(Notice).where(Notice.id == notice_id, Notice.deleted_at.is_(None))).first()
    if notice is None:
        return None

    published_at = payload.published_at
    if payload.status == "published" and published_at is None:
        published_at = notice.published_at or datetime.utcnow()
    elif payload.status != "published" and payload.published_at is None:
        published_at = None

    notice.title = payload.title
    notice.content = payload.content
    notice.status = payload.status
    notice.category = payload.category
    notice.is_pinned = payload.is_pinned
    notice.updated_by = user_id
    notice.updated_at = datetime.utcnow()
    notice.published_at = published_at

    db.add(notice)
    db.commit()
    db.refresh(notice)
    return notice


def delete_notice(db: Session, *, notice_id: int, user_id: int) -> bool:
    notice = db.exec(select(Notice).where(Notice.id == notice_id, Notice.deleted_at.is_(None))).first()
    if notice is None:
        return False

    notice.status = "archived"
    notice.updated_by = user_id
    notice.updated_at = datetime.utcnow()
    notice.deleted_at = datetime.utcnow()
    db.add(notice)
    db.commit()
    return True
