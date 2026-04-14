from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.core.auth_dependencies import require_roles
from app.core.constants import ROLE_ADMIN, ROLE_AUDITOR, ROLE_ORG_ADMIN, ROLE_USER
from app.crud.notice import (
    create_notice,
    delete_notice,
    get_admin_notice_by_id,
    get_notice_by_id,
    get_notice_detail_with_user,
    list_admin_notices,
    list_notices,
    update_notice,
)
from app.db.session import get_session
from app.models.user import User
from app.schemas.notice import (
    NoticeAdminDetailResponse,
    NoticeAdminListItemResponse,
    NoticeCreateRequest,
    NoticeDetailResponse,
    NoticeListItemResponse,
    NoticeUpdateRequest,
)

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


@router.get("/admin", response_model=list[NoticeAdminListItemResponse])
def read_admin_notices(
    category: str = "",
    status_filter: str = Query(default="", alias="status"),
    title: str = "",
    is_pinned: bool | None = None,
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_session),
    _user=Depends(require_roles(ROLE_ORG_ADMIN, ROLE_ADMIN)),
) -> list[NoticeAdminListItemResponse]:
    notices = list_admin_notices(
        db,
        category=category,
        status=status_filter,
        title=title,
        is_pinned=is_pinned,
        limit=limit,
    )
    return [
        NoticeAdminListItemResponse(
            id=notice.id or 0,
            title=notice.title,
            content=notice.content,
            category=notice.category,
            status=notice.status,
            is_pinned=notice.is_pinned,
            created_at=notice.created_at,
            updated_at=notice.updated_at,
            published_at=notice.published_at,
        )
        for notice in notices
    ]


@router.get("/admin/{notice_id}", response_model=NoticeAdminDetailResponse)
def read_admin_notice_detail(
    notice_id: int,
    db: Session = Depends(get_session),
    _user=Depends(require_roles(ROLE_ORG_ADMIN, ROLE_ADMIN)),
) -> NoticeAdminDetailResponse:
    notice = get_admin_notice_by_id(db, notice_id)
    if notice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found")

    created_user = db.get(User, notice.created_by)
    updated_by_name = None

    if notice.updated_by is not None:
        updated_user = db.get(User, notice.updated_by)
        updated_by_name = updated_user.username if updated_user is not None else None

    created_by_name = created_user.username if created_user is not None else ""

    return NoticeAdminDetailResponse(
        id=notice.id or 0,
        title=notice.title,
        content=notice.content,
        category=notice.category,
        status=notice.status,
        is_pinned=notice.is_pinned,
        created_by_name=created_by_name,
        updated_by_name=updated_by_name,
        created_at=notice.created_at,
        updated_at=notice.updated_at,
        published_at=notice.published_at,
    )


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


@router.post("/admin", response_model=NoticeAdminDetailResponse, status_code=status.HTTP_201_CREATED)
def create_admin_notice(
    payload: NoticeCreateRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_roles(ROLE_ORG_ADMIN, ROLE_ADMIN)),
) -> NoticeAdminDetailResponse:
    notice = create_notice(db, payload=payload, user_id=current_user.id or 0)
    created_user = db.get(User, notice.created_by)
    return NoticeAdminDetailResponse(
        id=notice.id or 0,
        title=notice.title,
        content=notice.content,
        category=notice.category,
        status=notice.status,
        is_pinned=notice.is_pinned,
        created_by_name=created_user.username if created_user is not None else "",
        updated_by_name=None,
        created_at=notice.created_at,
        updated_at=notice.updated_at,
        published_at=notice.published_at,
    )


@router.put("/admin/{notice_id}", response_model=NoticeAdminDetailResponse)
def update_admin_notice(
    notice_id: int,
    payload: NoticeUpdateRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_roles(ROLE_ORG_ADMIN, ROLE_ADMIN)),
) -> NoticeAdminDetailResponse:
    notice = update_notice(db, notice_id=notice_id, payload=payload, user_id=current_user.id or 0)
    if notice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found")

    created_user = db.get(User, notice.created_by)
    updated_user = db.get(User, notice.updated_by) if notice.updated_by is not None else None
    return NoticeAdminDetailResponse(
        id=notice.id or 0,
        title=notice.title,
        content=notice.content,
        category=notice.category,
        status=notice.status,
        is_pinned=notice.is_pinned,
        created_by_name=created_user.username if created_user is not None else "",
        updated_by_name=updated_user.username if updated_user is not None else None,
        created_at=notice.created_at,
        updated_at=notice.updated_at,
        published_at=notice.published_at,
    )


@router.delete("/admin/{notice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_notice(
    notice_id: int,
    db: Session = Depends(get_session),
    current_user=Depends(require_roles(ROLE_ORG_ADMIN, ROLE_ADMIN)),
) -> None:
    deleted = delete_notice(db, notice_id=notice_id, user_id=current_user.id or 0)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found")
