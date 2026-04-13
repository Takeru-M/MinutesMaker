from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session

from app.core.auth_dependencies import require_roles
from app.core.constants import ROLE_ADMIN, ROLE_AUDITOR, ROLE_ORG_ADMIN, ROLE_USER
from app.crud.agenda import create_agenda, get_agenda_by_id, list_agendas, search_agendas
from app.db.session import get_session
from app.schemas.agenda import (
    AgendaCreateRequest,
    AgendaListItemResponse,
    AgendaPdfUploadResponse,
    AgendaReadResponse,
    AgendaSearchItemResponse,
)
from app.services.s3_storage import build_public_s3_url, build_signed_s3_url, upload_agenda_pdf

router = APIRouter(prefix="/agendas", tags=["agendas"])


@router.get("", response_model=list[AgendaListItemResponse])
def read_agendas(
    sort_order: str = "default",
    db: Session = Depends(get_session),
    _user=Depends(require_roles(ROLE_USER, ROLE_ORG_ADMIN, ROLE_ADMIN, ROLE_AUDITOR)),
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
    _user=Depends(require_roles(ROLE_USER, ROLE_ORG_ADMIN, ROLE_ADMIN, ROLE_AUDITOR)),
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
    _user=Depends(require_roles(ROLE_USER, ROLE_ORG_ADMIN, ROLE_ADMIN, ROLE_AUDITOR)),
) -> AgendaReadResponse:
    agenda = get_agenda_by_id(db, agenda_id)
    if agenda is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agenda not found")

    response = AgendaReadResponse.model_validate(agenda)
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
    current_user=Depends(require_roles(ROLE_ORG_ADMIN, ROLE_ADMIN)),
) -> AgendaReadResponse:
    agenda = create_agenda(db, payload=payload, user_id=current_user.id or 0)
    return AgendaReadResponse.model_validate(agenda)


@router.post("/upload-pdf", response_model=AgendaPdfUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_agenda_pdf_file(
    file: UploadFile = File(...),
    _user=Depends(require_roles(ROLE_ORG_ADMIN, ROLE_ADMIN)),
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
