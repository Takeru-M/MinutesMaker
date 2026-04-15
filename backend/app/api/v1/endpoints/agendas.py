from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session

from app.core.auth_dependencies import require_permissions
from app.core.config import settings
from app.crud.agenda import (
    count_agenda_attachments,
    create_agenda_attachment,
    create_agenda,
    delete_agenda_attachment,
    delete_agenda,
    get_agenda_attachment_by_id,
    get_agenda_attachments,
    get_agenda_by_id,
    get_related_agenda_ids,
    list_agendas,
    search_agendas,
    update_agenda,
)
from app.db.session import get_session
from app.models.agenda import AgendaAttachment
from app.schemas.agenda import (
    AgendaAttachmentResponse,
    AgendaAttachmentUploadResponse,
    AgendaCreateRequest,
    AgendaListItemResponse,
    AgendaPdfUploadResponse,
    AgendaReadResponse,
    AgendaSearchItemResponse,
    AgendaUpdateRequest,
)
from app.core.constants import RELATION_TYPE_OTHER_REFERENCE, RELATION_TYPE_PAST_BLOCK
from app.services.s3_storage import build_public_s3_url, build_signed_s3_url, upload_agenda_pdf

router = APIRouter(prefix="/agendas", tags=["agendas"])


def _build_attachment_download_url(s3_key: str) -> str:
    try:
        return build_signed_s3_url(s3_key=s3_key)
    except ValueError:
        try:
            return build_public_s3_url(s3_key=s3_key)
        except ValueError:
            return ""


def _to_attachment_response(attachment: AgendaAttachment) -> AgendaAttachmentResponse:
    return AgendaAttachmentResponse(
        id=attachment.id or 0,
        file_name=attachment.file_name,
        s3_key=attachment.s3_key,
        download_url=_build_attachment_download_url(attachment.s3_key),
        file_size=attachment.file_size,
        mime_type=attachment.mime_type,
        order_no=attachment.order_no,
        created_at=attachment.created_at,
    )


@router.get("", response_model=list[AgendaListItemResponse])
def read_agendas(
    sort_order: str = "default",
    db: Session = Depends(get_session),
    _user=Depends(require_permissions("agenda.read")),
) -> list[AgendaListItemResponse]:
    rows = list_agendas(db, sort_order=sort_order)
    return [
        AgendaListItemResponse(
            id=agenda.id or 0,
            title=agenda.title,
            meeting_date=agenda.meeting_date,
            meeting_type=agenda.meeting_type,
            meeting_title=meeting.title,
            meeting_scheduled_at=meeting.scheduled_at,
        )
        for agenda, meeting in rows
    ]


@router.get("/search", response_model=list[AgendaSearchItemResponse])
def search_agenda_items(
    query: str = "",
    meeting_type: str | None = None,
    limit: int = 20,
    db: Session = Depends(get_session),
    _user=Depends(require_permissions("agenda.read")),
) -> list[AgendaSearchItemResponse]:
    rows = search_agendas(db, query=query.strip(), meeting_type=meeting_type, limit=max(1, min(limit, 50)))
    return [
        AgendaSearchItemResponse(
            id=agenda.id or 0,
            title=agenda.title,
            meeting_id=meeting.id or 0,
            meeting_title=meeting.title,
            meeting_type=meeting.meeting_type,
            meeting_scheduled_at=meeting.scheduled_at,
        )
        for agenda, meeting in rows
    ]


@router.get("/{agenda_id:int}", response_model=AgendaReadResponse)
def read_agenda(
    agenda_id: int,
    db: Session = Depends(get_session),
    _user=Depends(require_permissions("agenda.read")),
) -> AgendaReadResponse:
    agenda = get_agenda_by_id(db, agenda_id)
    if agenda is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agenda not found")

    response = AgendaReadResponse.model_validate(agenda)
    response = response.model_copy(
        update={
            "related_past_agenda_ids": get_related_agenda_ids(
                db,
                agenda_id=agenda.id or 0,
                relation_type=RELATION_TYPE_PAST_BLOCK,
            ),
            "related_other_agenda_ids": get_related_agenda_ids(
                db,
                agenda_id=agenda.id or 0,
                relation_type=RELATION_TYPE_OTHER_REFERENCE,
            ),
            "attachments": [
                _to_attachment_response(attachment) for attachment in get_agenda_attachments(db, agenda.id or 0)
            ],
        }
    )
    if agenda.pdf_s3_key:
        try:
            response.pdf_url = build_signed_s3_url(s3_key=agenda.pdf_s3_key)
        except ValueError:
            try:
                response.pdf_url = build_public_s3_url(s3_key=agenda.pdf_s3_key)
            except ValueError:
                pass
    return response


@router.post("", response_model=AgendaReadResponse, status_code=status.HTTP_201_CREATED)
def post_agenda(
    payload: AgendaCreateRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("agenda.create")),
) -> AgendaReadResponse:
    agenda = create_agenda(db, payload=payload, user_id=current_user.id or 0)
    response = AgendaReadResponse.model_validate(agenda)
    return response.model_copy(
        update={
            "related_past_agenda_ids": get_related_agenda_ids(
                db,
                agenda_id=agenda.id or 0,
                relation_type=RELATION_TYPE_PAST_BLOCK,
            ),
            "related_other_agenda_ids": get_related_agenda_ids(
                db,
                agenda_id=agenda.id or 0,
                relation_type=RELATION_TYPE_OTHER_REFERENCE,
            ),
            "attachments": [],
        }
    )


@router.put("/{agenda_id:int}", response_model=AgendaReadResponse)
def put_agenda(
    agenda_id: int,
    payload: AgendaUpdateRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("agenda.update")),
) -> AgendaReadResponse:
    agenda = update_agenda(db, agenda_id=agenda_id, payload=payload, user_id=current_user.id or 0)
    if agenda is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agenda not found")

    response = AgendaReadResponse.model_validate(agenda)
    response = response.model_copy(
        update={
            "related_past_agenda_ids": get_related_agenda_ids(
                db,
                agenda_id=agenda.id or 0,
                relation_type=RELATION_TYPE_PAST_BLOCK,
            ),
            "related_other_agenda_ids": get_related_agenda_ids(
                db,
                agenda_id=agenda.id or 0,
                relation_type=RELATION_TYPE_OTHER_REFERENCE,
            ),
            "attachments": [
                _to_attachment_response(attachment) for attachment in get_agenda_attachments(db, agenda.id or 0)
            ],
        }
    )
    if agenda.pdf_s3_key:
        try:
            response.pdf_url = build_signed_s3_url(s3_key=agenda.pdf_s3_key)
        except ValueError:
            try:
                response.pdf_url = build_public_s3_url(s3_key=agenda.pdf_s3_key)
            except ValueError:
                pass
    return response


@router.delete("/{agenda_id:int}", status_code=status.HTTP_204_NO_CONTENT)
def remove_agenda(
    agenda_id: int,
    db: Session = Depends(get_session),
    _user=Depends(require_permissions("agenda.delete")),
) -> None:
    deleted = delete_agenda(db, agenda_id=agenda_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agenda not found")


@router.post("/upload-pdf", response_model=AgendaPdfUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_agenda_pdf_file(
    file: UploadFile = File(...),
    _user=Depends(require_permissions("agenda.update")),
) -> AgendaPdfUploadResponse:
    filename = file.filename or "agenda.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are supported")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    try:
        uploaded = upload_agenda_pdf(file_bytes=file_bytes, filename=filename, content_type=file.content_type or "application/pdf")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload PDF") from exc

    return AgendaPdfUploadResponse(s3_key=uploaded.s3_key, url=uploaded.url)


@router.post(
    "/{agenda_id:int}/attachments/upload-pdf",
    response_model=AgendaAttachmentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_agenda_attachment(
    agenda_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    _user=Depends(require_permissions("agenda.update")),
) -> AgendaAttachmentUploadResponse:
    agenda = get_agenda_by_id(db, agenda_id)
    if agenda is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agenda not found")

    filename = file.filename or "agenda.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are supported")

    current_count = count_agenda_attachments(db, agenda_id)
    if current_count >= settings.agenda_attachment_max_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attachment limit exceeded (max {settings.agenda_attachment_max_count})",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    if len(file_bytes) > settings.pdf_max_upload_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file exceeds size limit")

    try:
        uploaded = upload_agenda_pdf(file_bytes=file_bytes, filename=filename, content_type=file.content_type or "application/pdf")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload PDF") from exc

    attachment = AgendaAttachment(
        agenda_id=agenda_id,
        file_name=filename,
        s3_key=uploaded.s3_key,
        file_size=len(file_bytes),
        mime_type=file.content_type or "application/pdf",
        order_no=current_count,
    )
    create_agenda_attachment(db, attachment)
    db.commit()
    db.refresh(attachment)

    return AgendaAttachmentUploadResponse(attachment=_to_attachment_response(attachment))


@router.delete("/{agenda_id:int}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agenda_attachment_endpoint(
    agenda_id: int,
    attachment_id: int,
    db: Session = Depends(get_session),
    _user=Depends(require_permissions("agenda.update")),
) -> None:
    agenda = get_agenda_by_id(db, agenda_id)
    if agenda is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agenda not found")

    attachment = get_agenda_attachment_by_id(db, attachment_id)
    if attachment is None or attachment.agenda_id != agenda_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    delete_agenda_attachment(db, attachment_id)
    db.commit()
