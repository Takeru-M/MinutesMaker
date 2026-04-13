from collections.abc import Sequence

from sqlmodel import Session, select

from app.models.content import Content, ContentAttachment


def filter_content_items(items: Sequence[dict[str, str]], query: str) -> list[dict[str, str]]:
    normalized_query = query.strip().lower()
    if not normalized_query:
        return sorted(items, key=lambda item: item["date"], reverse=True)

    return sorted(
        [
            item
            for item in items
            if normalized_query in item["title"].lower() or normalized_query in item["author"].lower()
        ],
        key=lambda item: item["date"],
        reverse=True,
    )


def get_content(db: Session, content_id: int) -> Content | None:
    return db.exec(select(Content).where(Content.id == content_id)).first()


def get_content_by_type(
    db: Session,
    content_type: str,
    status: str = "published",
    skip: int = 0,
    limit: int = 100,
) -> list[Content]:
    return db.exec(
        select(Content)
        .where(Content.content_type == content_type, Content.status == status, Content.deleted_at.is_(None))
        .offset(skip)
        .limit(limit)
        .order_by(Content.created_at.desc())
    ).all()


def get_content_count(
    db: Session,
    content_type: str,
    status: str = "published",
) -> int:
    return db.exec(
        select(Content).where(Content.content_type == content_type, Content.status == status, Content.deleted_at.is_(None))
    ).all().__len__()


def search_content(
    db: Session,
    content_type: str,
    query: str = "",
    status: str = "published",
    skip: int = 0,
    limit: int = 100,
) -> list[Content]:
    normalized_query = query.strip().lower()
    statement = select(Content).where(
        Content.content_type == content_type,
        Content.status == status,
        Content.deleted_at.is_(None),
    )
    
    if normalized_query:
        statement = statement.where(
            (Content.title.icontains(normalized_query)) | (Content.content.icontains(normalized_query))
        )
    
    return db.exec(statement.offset(skip).limit(limit).order_by(Content.created_at.desc())).all()


def create_content(db: Session, content: Content) -> Content:
    db.add(content)
    db.flush()
    return content


def update_content(db: Session, content: Content) -> Content:
    db.add(content)
    db.flush()
    return content


def delete_content(db: Session, content_id: int) -> None:
    content = db.exec(select(Content).where(Content.id == content_id)).first()
    if content:
        db.delete(content)
        db.flush()


def get_content_attachments(db: Session, content_id: int) -> list[ContentAttachment]:
    return db.exec(
        select(ContentAttachment)
        .where(ContentAttachment.content_id == content_id)
        .order_by(ContentAttachment.order_no)
    ).all()


def create_content_attachment(db: Session, attachment: ContentAttachment) -> ContentAttachment:
    db.add(attachment)
    db.flush()
    return attachment


def delete_content_attachment(db: Session, attachment_id: int) -> None:
    attachment = db.exec(select(ContentAttachment).where(ContentAttachment.id == attachment_id)).first()
    if attachment:
        db.delete(attachment)
        db.flush()

