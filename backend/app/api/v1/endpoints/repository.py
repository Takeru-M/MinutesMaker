from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.core.auth_dependencies import require_roles
from app.core.constants import ROLE_ADMIN, ROLE_AUDITOR, ROLE_ORG_ADMIN, ROLE_USER
from app.crud.content import (
    get_content,
    get_content_attachments,
    get_content_by_type,
    search_content,
)
from app.crud.user import get_user_by_id
from app.db.session import get_session
from app.schemas.content import (
    ContentAttachmentResponse,
    ContentDetailResponse,
    ContentItemResponse,
)

router = APIRouter(prefix="/repository", tags=["repository"])


def _parse_content_id(content_id: str) -> int:
    normalized = (content_id or "").strip()
    if normalized and normalized.isdigit():
        return int(normalized)

    last_token = normalized.split("-")[-1] if normalized else ""
    if last_token.isdigit():
        return int(last_token)

    raise HTTPException(status_code=400, detail="Invalid content_id")


@router.get("", response_model=list[ContentItemResponse])
def read_repository_items(
    q: str = "",
    db: Session = Depends(get_session),
    _user=Depends(require_roles(ROLE_USER, ROLE_ORG_ADMIN, ROLE_ADMIN, ROLE_AUDITOR)),
) -> list[ContentItemResponse]:
    if q.strip():
        contents = search_content(db, "repository", q)
    else:
        contents = get_content_by_type(db, "repository")
    
    result = []
    for content in contents:
        author = get_user_by_id(db, content.created_by)
        author_name = author.full_name or author.username if author else "-"
        result.append(
            ContentItemResponse(
                db_id=content.id,
                id=f"repository-{content.created_at.strftime('%Y%m%d')}-{content.id}",
                title=content.title,
                author=author_name,
                date=content.created_at.date(),
            )
        )
    return result


@router.get("/{content_id}", response_model=ContentDetailResponse)
def read_repository_detail(
    content_id: str,
    db: Session = Depends(get_session),
    _user=Depends(require_roles(ROLE_USER, ROLE_ORG_ADMIN, ROLE_ADMIN, ROLE_AUDITOR)),
) -> ContentDetailResponse:
    numeric_content_id = _parse_content_id(content_id)
    content = get_content(db, numeric_content_id)
    if not content or content.content_type != "repository" or content.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    attachments = get_content_attachments(db, numeric_content_id)
    author = get_user_by_id(db, content.created_by)
    author_name = author.full_name or author.username if author else "-"
    attachment_responses = [
        ContentAttachmentResponse(
            id=a.id,
            file_name=a.file_name,
            s3_key=a.s3_key,
            file_size=a.file_size,
            mime_type=a.mime_type,
            order_no=a.order_no,
            created_at=a.created_at,
        )
        for a in attachments
    ]
    
    return ContentDetailResponse(
        id=content.id,
        content_type=content.content_type,
        title=content.title,
        content=content.content,
        status=content.status,
        created_by_name=author_name,
        updated_by=content.updated_by,
        created_at=content.created_at,
        updated_at=content.updated_at,
        attachments=attachment_responses,
    )

