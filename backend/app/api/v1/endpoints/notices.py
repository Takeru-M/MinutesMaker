from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.core.auth_dependencies import require_roles
from app.core.constants import ROLE_ADMIN, ROLE_AUDITOR, ROLE_ORG_ADMIN, ROLE_USER
from app.crud.notice import get_notice_by_id, get_notice_detail_with_user, list_notices
from app.db.session import get_session
from app.schemas.notice import NoticeDetailResponse, NoticeListItemResponse

router = APIRouter(prefix="/notices", tags=["notices"])


@router.get("", response_model=list[NoticeListItemResponse])
def read_notices(
    date: date | None = None,
    source: str = "",
    title: str = "",
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_session),
    _user=Depends(require_roles(ROLE_USER, ROLE_ORG_ADMIN, ROLE_ADMIN, ROLE_AUDITOR)),
) -> list[NoticeListItemResponse]:
    notices = list_notices(db, date_filter=date, source=source, title=title, limit=limit)
    return [
        NoticeListItemResponse(
            id=notice.id or 0,
            title=notice.title,
            content=notice.content,
            category=notice.category,
            created_at=notice.created_at,
            published_at=notice.published_at,
        )
        for notice in notices
    ]


@router.get("/{notice_id}", response_model=NoticeDetailResponse)
def read_notice_detail(
    notice_id: int,
    db: Session = Depends(get_session),
    _user=Depends(require_roles(ROLE_USER, ROLE_ORG_ADMIN, ROLE_ADMIN, ROLE_AUDITOR)),
) -> NoticeDetailResponse:
    notice_detail = get_notice_detail_with_user(db, notice_id)
    if notice_detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found")

    return NoticeDetailResponse(
        id=notice_detail["id"],
        title=notice_detail["title"],
        content=notice_detail["content"],
        category=notice_detail["category"],
        created_by_name=notice_detail["created_by_name"],
        published_at=notice_detail["published_at"],
    )
