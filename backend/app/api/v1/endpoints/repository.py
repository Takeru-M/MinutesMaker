from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session

from app.core.auth_dependencies import require_permissions
from app.core.config import settings
from app.crud.content import (
    count_content_attachments,
    create_content_attachment,
    delete_content_attachment,
    create_admin_content,
    delete_admin_content,
    get_content_attachment_by_id,
    get_content,
    get_content_attachments,
    get_content_by_type,
    search_content,
    update_admin_content,
)
from app.crud.user import get_user_by_id
from app.db.session import get_session
from app.models.content import ContentAttachment
from app.schemas.content import (
    ContentAdminDetailResponse,
    ContentAttachmentResponse,
    ContentAttachmentUploadResponse,
    ContentDetailResponse,
    ContentItemResponse,
    ContentWriteRequest,
)
from app.services.s3_storage import build_public_s3_url, build_signed_s3_url, upload_content_pdf

router = APIRouter(prefix="/repository", tags=["repository"])


def _resolve_content_attachment_limit(content_type: str) -> int:
    if content_type == "repository":
        return settings.repository_attachment_max_count
    if content_type == "guide":
        return settings.guide_attachment_max_count
    return settings.repository_attachment_max_count


def _build_attachment_download_url(s3_key: str) -> str:
    try:
        return build_signed_s3_url(s3_key=s3_key)
    except ValueError:
        try:
            return build_public_s3_url(s3_key=s3_key)
        except ValueError:
            return ""


def _to_attachment_response(attachment: ContentAttachment) -> ContentAttachmentResponse:
    return ContentAttachmentResponse(
        id=attachment.id or 0,
        file_name=attachment.file_name,
        s3_key=attachment.s3_key,
        download_url=_build_attachment_download_url(attachment.s3_key),
        file_size=attachment.file_size,
        mime_type=attachment.mime_type,
        order_no=attachment.order_no,
        created_at=attachment.created_at,
    )


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
    _user=Depends(require_permissions("repository.read")),
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
    _user=Depends(require_permissions("repository.read")),
) -> ContentDetailResponse:
    numeric_content_id = _parse_content_id(content_id)
    content = get_content(db, numeric_content_id)
    if not content or content.content_type != "repository" or content.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    attachments = get_content_attachments(db, numeric_content_id)
    author = get_user_by_id(db, content.created_by)
    author_name = author.full_name or author.username if author else "-"
    attachment_responses = [
        _to_attachment_response(a)
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
def read_repository_admin_detail(
    content_id: str,
    db: Session = Depends(get_session),
    _user=Depends(require_permissions("repository.update")),
) -> ContentAdminDetailResponse:
    numeric_content_id = _parse_content_id(content_id)
    content = get_content(db, numeric_content_id)
    if not content or content.content_type != "repository" or content.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    attachments = get_content_attachments(db, numeric_content_id)
    created_user = get_user_by_id(db, content.created_by)
    updated_user = get_user_by_id(db, content.updated_by) if content.updated_by is not None else None
    attachment_responses = [
        _to_attachment_response(a)
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
def create_repository_admin_content(
    payload: ContentWriteRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("repository.create")),
) -> ContentAdminDetailResponse:
    content = create_admin_content(db, content_type="repository", payload=payload, user_id=current_user.id or 0)
    return read_repository_admin_detail(str(content.id), db=db)


@router.put("/admin/{content_id}", response_model=ContentAdminDetailResponse)
def update_repository_admin_content(
    content_id: str,
    payload: ContentWriteRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("repository.update")),
) -> ContentAdminDetailResponse:
    numeric_content_id = _parse_content_id(content_id)
    content = update_admin_content(db, content_id=numeric_content_id, payload=payload, user_id=current_user.id or 0)
    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    return read_repository_admin_detail(str(numeric_content_id), db=db)


@router.delete("/admin/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_repository_admin_content(
    content_id: str,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("repository.delete")),
) -> None:
    numeric_content_id = _parse_content_id(content_id)
    deleted = delete_admin_content(db, numeric_content_id, current_user.id or 0)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")


@router.post(
    "/admin/{content_id}/attachments/upload-pdf",
    response_model=ContentAttachmentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_repository_attachment(
    content_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    _user=Depends(require_permissions("repository.update")),
) -> ContentAttachmentUploadResponse:
    numeric_content_id = _parse_content_id(content_id)
    content = get_content(db, numeric_content_id)
    if not content or content.content_type != "repository" or content.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    filename = file.filename or "repository.pdf"
    if Path(filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are supported")

    current_count = count_content_attachments(db, numeric_content_id)
    max_count = _resolve_content_attachment_limit(content.content_type)
    if current_count >= max_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attachment limit exceeded (max {max_count})",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    if len(file_bytes) > settings.pdf_max_upload_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file exceeds size limit")

    try:
        uploaded = upload_content_pdf(
            file_bytes=file_bytes,
            filename=filename,
            prefix="repository",
            content_type=file.content_type or "application/pdf",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload PDF") from exc

    attachment = ContentAttachment(
        content_id=numeric_content_id,
        file_name=filename,
        s3_key=uploaded.s3_key,
        file_size=len(file_bytes),
        mime_type=file.content_type or "application/pdf",
        order_no=current_count,
    )
    create_content_attachment(db, attachment)
    db.commit()
    db.refresh(attachment)

    return ContentAttachmentUploadResponse(attachment=_to_attachment_response(attachment))


@router.delete("/admin/{content_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_repository_attachment(
    content_id: str,
    attachment_id: int,
    db: Session = Depends(get_session),
    _user=Depends(require_permissions("repository.update")),
) -> None:
    numeric_content_id = _parse_content_id(content_id)
    content = get_content(db, numeric_content_id)
    if not content or content.content_type != "repository" or content.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    attachment = get_content_attachment_by_id(db, attachment_id)
    if attachment is None or attachment.content_id != numeric_content_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    delete_content_attachment(db, attachment_id)
    db.commit()

