from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session

from app.core.auth_dependencies import require_permissions
from app.crud.agenda import get_agenda_by_id
from app.crud.meeting import get_meeting_by_id
from app.crud.minutes import (
    count_minutes_by_agenda_id,
    count_minutes_by_meeting_id,
    create_minute,
    delete_minute,
    get_minute_by_id,
    list_minutes_by_agenda_id,
    list_minutes_by_meeting_id,
    update_minute,
)
from app.db.session import get_session
from app.schemas.minutes import (
    MinutesCreateRequest,
    MinutesListResponse,
    MinutesPdfUploadResponse,
    MinutesResponse,
)
from app.services.meeting_access import can_access_meeting
from app.models.minutes import Minutes
from app.services.s3_storage import build_public_s3_url, upload_minutes_pdf

router = APIRouter(prefix="/minutes", tags=["minutes"])


def _is_within_minutes_mutation_window(meeting_scheduled_at: datetime, *, now: datetime | None = None) -> bool:
    current_date = (now or datetime.utcnow()).date()
    meeting_date = meeting_scheduled_at.date()
    delta_days = (current_date - meeting_date).days
    return 0 <= delta_days <= 2


def _ensure_minutes_mutation_window(meeting_scheduled_at: datetime) -> None:
    if not _is_within_minutes_mutation_window(meeting_scheduled_at):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Minutes can only be added, updated, or deleted on the meeting day and the following two days",
        )


def _validate_minutes_payload(payload: MinutesCreateRequest) -> tuple[str, str | None, str | None, str | None]:
    normalized_content_type = payload.content_type.strip().lower()
    if normalized_content_type not in {"text", "pdf"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="content_type must be either 'text' or 'pdf'")

    if normalized_content_type == "text":
        body = (payload.body or "").strip()
        if not body:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="body is required when content_type is 'text'")
        return normalized_content_type, body, None, None

    if not payload.pdf_url and not payload.pdf_s3_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="pdf_url is required when content_type is 'pdf'")

    normalized_pdf_url = payload.pdf_url
    if payload.pdf_s3_key:
        try:
            normalized_pdf_url = build_public_s3_url(s3_key=payload.pdf_s3_key)
        except ValueError:
            normalized_pdf_url = payload.pdf_url

    return normalized_content_type, "", payload.pdf_s3_key, normalized_pdf_url


@router.post("/agenda/{agenda_id}", response_model=MinutesResponse, status_code=status.HTTP_201_CREATED)
def create_minute_for_agenda(
    agenda_id: int,
    payload: MinutesCreateRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("minutes.create")),
) -> MinutesResponse:
    """Create a new minute for a specific agenda."""
    # Verify agenda exists
    agenda = get_agenda_by_id(db, agenda_id)
    if agenda is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agenda not found")

    if not can_access_meeting(db, meeting_id=agenda.meeting_id, user=current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    meeting = get_meeting_by_id(db, agenda.meeting_id)
    if meeting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    _ensure_minutes_mutation_window(meeting.scheduled_at)

    content_type, body, pdf_s3_key, pdf_url = _validate_minutes_payload(payload)

    # Create the minute
    minute = Minutes(
        agenda_id=agenda_id,
        meeting_id=agenda.meeting_id,
        scope_type="agenda",
        scope_entity_id=agenda_id,
        title=payload.title,
        body=body,
        content_type=content_type,
        pdf_s3_key=pdf_s3_key,
        pdf_url=pdf_url,
        status="draft",
        created_by=current_user.id or 0,
    )

    created_minute = create_minute(db, minute)
    return MinutesResponse.model_validate(created_minute)


@router.get("/agenda/{agenda_id}", response_model=MinutesListResponse)
def list_minutes_for_agenda(
    agenda_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_session),
    _user=Depends(require_permissions("minutes.read")),
) -> MinutesListResponse:
    """List all minutes for a specific agenda."""
    # Verify agenda exists
    agenda = get_agenda_by_id(db, agenda_id)
    if agenda is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agenda not found")

    if not can_access_meeting(db, meeting_id=agenda.meeting_id, user=_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    minutes_list = list_minutes_by_agenda_id(db, agenda_id, skip=skip, limit=limit)
    total = count_minutes_by_agenda_id(db, agenda_id)

    return MinutesListResponse(
        total=total,
        items=[MinutesResponse.model_validate(m) for m in minutes_list],
    )


@router.post("/meeting/{meeting_id}", response_model=MinutesResponse, status_code=status.HTTP_201_CREATED)
def create_minute_for_meeting(
    meeting_id: int,
    payload: MinutesCreateRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("minutes.create")),
) -> MinutesResponse:
    """Create a new minute for a specific meeting."""
    meeting = get_meeting_by_id(db, meeting_id)
    if meeting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    if not can_access_meeting(db, meeting_id=meeting_id, user=current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    _ensure_minutes_mutation_window(meeting.scheduled_at)

    content_type, body, pdf_s3_key, pdf_url = _validate_minutes_payload(payload)

    minute = Minutes(
        meeting_id=meeting_id,
        agenda_id=None,
        scope_type="meeting",
        scope_entity_id=meeting_id,
        title=payload.title,
        body=body,
        content_type=content_type,
        pdf_s3_key=pdf_s3_key,
        pdf_url=pdf_url,
        status="draft",
        created_by=current_user.id or 0,
    )

    created_minute = create_minute(db, minute)
    return MinutesResponse.model_validate(created_minute)


@router.get("/meeting/{meeting_id}", response_model=MinutesListResponse)
def list_minutes_for_meeting(
    meeting_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_session),
    _user=Depends(require_permissions("minutes.read")),
) -> MinutesListResponse:
    """List all minutes for a specific meeting."""
    meeting = get_meeting_by_id(db, meeting_id)
    if meeting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    if not can_access_meeting(db, meeting_id=meeting_id, user=_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    minutes_list = list_minutes_by_meeting_id(db, meeting_id, skip=skip, limit=limit)
    total = count_minutes_by_meeting_id(db, meeting_id)

    return MinutesListResponse(
        total=total,
        items=[MinutesResponse.model_validate(m) for m in minutes_list],
    )


@router.get("/{minute_id}", response_model=MinutesResponse)
def get_minute(
    minute_id: int,
    db: Session = Depends(get_session),
    _user=Depends(require_permissions("minutes.read")),
) -> MinutesResponse:
    """Get a specific minute by ID."""
    minute = get_minute_by_id(db, minute_id)
    if minute is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Minute not found")

    if not can_access_meeting(db, meeting_id=minute.meeting_id, user=_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    return MinutesResponse.model_validate(minute)


@router.put("/{minute_id}", response_model=MinutesResponse)
def update_minute_endpoint(
    minute_id: int,
    payload: MinutesCreateRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("minutes.update")),
) -> MinutesResponse:
    """Update a specific minute by ID."""
    minute = get_minute_by_id(db, minute_id)
    if minute is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Minute not found")

    if not can_access_meeting(db, meeting_id=minute.meeting_id, user=current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    meeting = get_meeting_by_id(db, minute.meeting_id)
    if meeting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    _ensure_minutes_mutation_window(meeting.scheduled_at)

    if minute.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the creator can edit this minute")

    content_type, body, pdf_s3_key, pdf_url = _validate_minutes_payload(payload)

    minute.title = payload.title
    minute.body = body
    minute.content_type = content_type
    minute.pdf_s3_key = pdf_s3_key
    minute.pdf_url = pdf_url

    updated_minute = update_minute(db, minute)
    return MinutesResponse.model_validate(updated_minute)


@router.delete("/{minute_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_minute_endpoint(
    minute_id: int,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("minutes.update")),
) -> None:
    """Delete a minute (soft delete)."""
    minute = get_minute_by_id(db, minute_id)
    if minute is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Minute not found")

    if not can_access_meeting(db, meeting_id=minute.meeting_id, user=current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    meeting = get_meeting_by_id(db, minute.meeting_id)
    if meeting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    _ensure_minutes_mutation_window(meeting.scheduled_at)

    if minute.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the creator can delete this minute")

    delete_minute(db, minute_id)


@router.post("/upload-pdf", response_model=MinutesPdfUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_minutes_pdf_file(
    file: UploadFile = File(...),
    _user=Depends(require_permissions("minutes.create")),
) -> MinutesPdfUploadResponse:
    filename = file.filename or "minutes.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are supported")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    try:
        uploaded = upload_minutes_pdf(
            file_bytes=file_bytes,
            filename=filename,
            content_type=file.content_type or "application/pdf",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload PDF") from exc

    return MinutesPdfUploadResponse(s3_key=uploaded.s3_key, url=uploaded.url)
