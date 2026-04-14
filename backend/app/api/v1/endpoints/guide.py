from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.auth_dependencies import require_roles
from app.core.constants import ROLE_ADMIN, ROLE_AUDITOR, ROLE_ORG_ADMIN, ROLE_USER
from app.crud.content import (
    create_admin_content,
    delete_admin_content,
    get_content,
    get_content_attachments,
    get_content_by_type,
    search_content,
    update_admin_content,
)
from app.crud.user import get_user_by_id
from app.db.session import get_session
from app.schemas.content import (
    ContentAdminDetailResponse,
    ContentAttachmentResponse,
    ContentDetailResponse,
    ContentItemResponse,
    ContentWriteRequest,
)

router = APIRouter(prefix="/guide", tags=["guide"])


def _parse_content_id(content_id: str) -> int:
    normalized = (content_id or "").strip()
    if normalized and normalized.isdigit():
        return int(normalized)

    last_token = normalized.split("-")[-1] if normalized else ""
    if last_token.isdigit():
        return int(last_token)

    raise HTTPException(status_code=400, detail="Invalid content_id")


@router.get("", response_model=list[ContentItemResponse])
def read_guide_items(
    q: str = "",
    db: Session = Depends(get_session),
    _user=Depends(require_roles(ROLE_USER, ROLE_ORG_ADMIN, ROLE_ADMIN, ROLE_AUDITOR)),
) -> list[ContentItemResponse]:
    if q.strip():
        contents = search_content(db, "guide", q)
    else:
        contents = get_content_by_type(db, "guide")
    
    result = []
    for content in contents:
        author = get_user_by_id(db, content.created_by)
        author_name = author.full_name or author.username if author else "-"
        result.append(
            ContentItemResponse(
                db_id=content.id,
                id=f"guide-{content.created_at.strftime('%Y%m%d')}-{content.id}",
                title=content.title,
                author=author_name,
                date=content.created_at.date(),
            )
        )
    return result


@router.get("/{content_id}", response_model=ContentDetailResponse)
def read_guide_detail(
    content_id: str,
    db: Session = Depends(get_session),
    _user=Depends(require_roles(ROLE_USER, ROLE_ORG_ADMIN, ROLE_ADMIN, ROLE_AUDITOR)),
) -> ContentDetailResponse:
    numeric_content_id = _parse_content_id(content_id)
    content = get_content(db, numeric_content_id)
    if not content or content.content_type != "guide" or content.deleted_at is not None:
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


@router.get("/admin/{content_id}", response_model=ContentAdminDetailResponse)
def read_guide_admin_detail(
    content_id: str,
    db: Session = Depends(get_session),
    _user=Depends(require_roles(ROLE_ORG_ADMIN, ROLE_ADMIN)),
) -> ContentAdminDetailResponse:
    numeric_content_id = _parse_content_id(content_id)
    content = get_content(db, numeric_content_id)
    if not content or content.content_type != "guide" or content.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    attachments = get_content_attachments(db, numeric_content_id)
    created_user = get_user_by_id(db, content.created_by)
    updated_user = get_user_by_id(db, content.updated_by) if content.updated_by is not None else None
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

    return ContentAdminDetailResponse(
        id=content.id,
        content_type=content.content_type,
        title=content.title,
        content=content.content,
        status=content.status,
        created_by_name=created_user.full_name or created_user.username if created_user else "-",
        updated_by_name=updated_user.full_name or updated_user.username if updated_user else None,
        created_at=content.created_at,
        updated_at=content.updated_at,
        attachments=attachment_responses,
    )


@router.post("/admin", response_model=ContentAdminDetailResponse, status_code=status.HTTP_201_CREATED)
def create_guide_admin_content(
    payload: ContentWriteRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_roles(ROLE_ORG_ADMIN, ROLE_ADMIN)),
) -> ContentAdminDetailResponse:
    content = create_admin_content(db, content_type="guide", payload=payload, user_id=current_user.id or 0)
    return read_guide_admin_detail(str(content.id), db=db)


@router.put("/admin/{content_id}", response_model=ContentAdminDetailResponse)
def update_guide_admin_content(
    content_id: str,
    payload: ContentWriteRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_roles(ROLE_ORG_ADMIN, ROLE_ADMIN)),
) -> ContentAdminDetailResponse:
    numeric_content_id = _parse_content_id(content_id)
    content = update_admin_content(db, content_id=numeric_content_id, payload=payload, user_id=current_user.id or 0)
    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    return read_guide_admin_detail(str(numeric_content_id), db=db)


@router.delete("/admin/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_guide_admin_content(
    content_id: str,
    db: Session = Depends(get_session),
    current_user=Depends(require_roles(ROLE_ORG_ADMIN, ROLE_ADMIN)),
) -> None:
    numeric_content_id = _parse_content_id(content_id)
    deleted = delete_admin_content(db, numeric_content_id, current_user.id or 0)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

