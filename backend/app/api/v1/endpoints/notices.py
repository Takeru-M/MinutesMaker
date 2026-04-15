from datetime import date
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlmodel import Session

from app.core.auth_dependencies import require_permissions
from app.core.config import settings
from app.crud.notice import (
    count_notice_attachments,
    create_notice_attachment,
    create_notice,
    delete_notice_attachment,
    delete_notice,
    get_notice_attachment_by_id,
    get_notice_attachments,
    get_admin_notice_by_id,
    get_notice_by_id,
    get_notice_detail_with_user,
    list_admin_notices,
    list_notices,
    update_notice,
)
from app.db.session import get_session
from app.models.notice import NoticeAttachment
from app.models.user import User
from app.schemas.notice import (
    NoticeAdminDetailResponse,
    NoticeAttachmentResponse,
    NoticeAttachmentUploadResponse,
    NoticeAdminListItemResponse,
    NoticeCreateRequest,
    NoticeDetailResponse,
    NoticeListItemResponse,
    NoticeUpdateRequest,
)
from app.services.s3_storage import build_public_s3_url, build_signed_s3_url, upload_notice_pdf

router = APIRouter(prefix="/notices", tags=["notices"])


def _build_attachment_download_url(s3_key: str) -> str:
    try:
        return build_signed_s3_url(s3_key=s3_key)
    except ValueError:
        try:
            return build_public_s3_url(s3_key=s3_key)
        except ValueError:
            return ""


def _to_notice_attachment_response(attachment: NoticeAttachment) -> NoticeAttachmentResponse:
    return NoticeAttachmentResponse(
        id=attachment.id or 0,
        file_name=attachment.file_name,
        s3_key=attachment.s3_key,
        download_url=_build_attachment_download_url(attachment.s3_key),
        file_size=attachment.file_size,
        mime_type=attachment.mime_type,
        order_no=attachment.order_no,
        created_at=attachment.created_at,
    )


@router.get("", response_model=list[NoticeListItemResponse])
def read_notices(
    date: date | None = None,
    source: str = "",
    title: str = "",
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_session),
    _user=Depends(require_permissions("notice.read")),
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
    _user=Depends(require_permissions("notice.update")),
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
    _user=Depends(require_permissions("notice.update")),
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
    attachments = get_notice_attachments(db, notice.id or 0)

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
        attachments=[_to_notice_attachment_response(attachment) for attachment in attachments],
    )


@router.get("/{notice_id}", response_model=NoticeDetailResponse)
def read_notice_detail(
    notice_id: int,
    db: Session = Depends(get_session),
    _user=Depends(require_permissions("notice.read")),
) -> NoticeDetailResponse:
    notice_detail = get_notice_detail_with_user(db, notice_id)
    if notice_detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found")

    attachments = get_notice_attachments(db, notice_detail["id"])

    return NoticeDetailResponse(
        id=notice_detail["id"],
        title=notice_detail["title"],
        content=notice_detail["content"],
        category=notice_detail["category"],
        created_by_name=notice_detail["created_by_name"],
        published_at=notice_detail["published_at"],
        attachments=[_to_notice_attachment_response(attachment) for attachment in attachments],
    )


@router.post("/admin", response_model=NoticeAdminDetailResponse, status_code=status.HTTP_201_CREATED)
def create_admin_notice(
    payload: NoticeCreateRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("notice.create")),
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
        attachments=[],
    )


@router.put("/admin/{notice_id}", response_model=NoticeAdminDetailResponse)
def update_admin_notice(
    notice_id: int,
    payload: NoticeUpdateRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("notice.update")),
) -> NoticeAdminDetailResponse:
    notice = update_notice(db, notice_id=notice_id, payload=payload, user_id=current_user.id or 0)
    if notice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found")

    created_user = db.get(User, notice.created_by)
    updated_user = db.get(User, notice.updated_by) if notice.updated_by is not None else None
    attachments = get_notice_attachments(db, notice.id or 0)

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
        attachments=[_to_notice_attachment_response(attachment) for attachment in attachments],
    )


@router.delete("/admin/{notice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_notice(
    notice_id: int,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("notice.delete")),
) -> None:
    deleted = delete_notice(db, notice_id=notice_id, user_id=current_user.id or 0)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found")


@router.post(
    "/admin/{notice_id}/attachments/upload-pdf",
    response_model=NoticeAttachmentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_notice_attachment(
    notice_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    _user=Depends(require_permissions("notice.update")),
) -> NoticeAttachmentUploadResponse:
    notice = get_admin_notice_by_id(db, notice_id)
    if notice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found")

    filename = file.filename or "notice.pdf"
    if Path(filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are supported")

    current_count = count_notice_attachments(db, notice_id)
    if current_count >= settings.notice_attachment_max_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attachment limit exceeded (max {settings.notice_attachment_max_count})",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    if len(file_bytes) > settings.pdf_max_upload_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file exceeds size limit")

    try:
        uploaded = upload_notice_pdf(
            file_bytes=file_bytes,
            filename=filename,
            content_type=file.content_type or "application/pdf",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload PDF") from exc

    attachment = NoticeAttachment(
        notice_id=notice_id,
        file_name=filename,
        s3_key=uploaded.s3_key,
        file_size=len(file_bytes),
        mime_type=file.content_type or "application/pdf",
        order_no=current_count,
    )
    create_notice_attachment(db, attachment)
    db.commit()
    db.refresh(attachment)

    return NoticeAttachmentUploadResponse(attachment=_to_notice_attachment_response(attachment))


@router.delete("/admin/{notice_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notice_attachment_endpoint(
    notice_id: int,
    attachment_id: int,
    db: Session = Depends(get_session),
    _user=Depends(require_permissions("notice.update")),
) -> None:
    notice = get_admin_notice_by_id(db, notice_id)
    if notice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notice not found")

    attachment = get_notice_attachment_by_id(db, attachment_id)
    if attachment is None or attachment.notice_id != notice_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    delete_notice_attachment(db, attachment_id)
    db.commit()
