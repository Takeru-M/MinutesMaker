from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.core.auth_dependencies import require_roles
from app.core.constants import ROLE_ADMIN, ROLE_AUDITOR, ROLE_ORG_ADMIN, ROLE_USER
from app.crud.meeting import (
    create_meeting,
    delete_meeting,
    get_meeting_by_id,
    list_agendas_by_meeting_id,
    list_meetings,
    update_meeting,
)
from app.db.session import get_session
from app.schemas.meeting import (
    MeetingAgendaItemResponse,
    MeetingCreateRequest,
    MeetingDetailResponse,
    MeetingListItemResponse,
    MeetingUpdateRequest,
)
from app.services.meeting_access import can_access_meeting
from app.services.s3_storage import build_signed_s3_url

router = APIRouter(prefix="/meetings", tags=["meetings"])


def _normalize_meeting_type_for_response(meeting_type: str) -> str:
    # Backward compatibility for legacy records that still store "large".
    if meeting_type == "large":
        return "dormitory_general_assembly"
    return meeting_type


@router.get("", response_model=list[MeetingListItemResponse])
def read_meetings(
    date: date | None = None,
    host: str = "",
    title: str = "",
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_session),
) -> list[MeetingListItemResponse]:
    meetings = list_meetings(db, date_filter=date, host=host, title=title, limit=limit)
    return [
        MeetingListItemResponse(
            id=meeting.id or 0,
            title=meeting.title,
            scheduled_at=meeting.scheduled_at,
            location=meeting.location,
            meeting_type=_normalize_meeting_type_for_response(meeting.meeting_type),
            meeting_scale=meeting.meeting_scale,
        )
        for meeting in meetings
    ]


@router.get("/{meeting_id}", response_model=MeetingDetailResponse)
def read_meeting_detail(
    meeting_id: int,
    db: Session = Depends(get_session),
    current_user=Depends(require_roles(ROLE_USER, ROLE_ORG_ADMIN, ROLE_ADMIN, ROLE_AUDITOR)),
) -> MeetingDetailResponse:
    meeting = get_meeting_by_id(db, meeting_id)
    if meeting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    if not can_access_meeting(db, meeting_id=meeting_id, user=current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    agendas = list_agendas_by_meeting_id(db, meeting_id)

    return MeetingDetailResponse(
        id=meeting.id or 0,
        title=meeting.title,
        description=meeting.description,
        scheduled_at=meeting.scheduled_at,
        location=meeting.location,
        status=meeting.status,
        meeting_type=_normalize_meeting_type_for_response(meeting.meeting_type),
        meeting_scale=meeting.meeting_scale,
        agendas=[
            MeetingAgendaItemResponse(
                id=agenda.id or 0,
                title=agenda.title,
                responsible=agenda.responsible,
                status=agenda.status,
                order_no=agenda.order_no,
                content=agenda.content,
                pdf_s3_key=agenda.pdf_s3_key,
                pdf_url=(
                    build_signed_s3_url(s3_key=agenda.pdf_s3_key)
                    if agenda.pdf_s3_key
                    else agenda.pdf_url
                ),
            )
            for agenda in agendas
        ],
    )


@router.post("", response_model=MeetingDetailResponse, status_code=status.HTTP_201_CREATED)
def post_meeting(
    payload: MeetingCreateRequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_roles(ROLE_ORG_ADMIN, ROLE_ADMIN)),
) -> MeetingDetailResponse:
    meeting = create_meeting(db, payload=payload, user_id=current_user.id or 0)
    return MeetingDetailResponse(
        id=meeting.id or 0,
        title=meeting.title,
        description=meeting.description,
        scheduled_at=meeting.scheduled_at,
        location=meeting.location,
        status=meeting.status,
        meeting_type=_normalize_meeting_type_for_response(meeting.meeting_type),
        meeting_scale=meeting.meeting_scale,
        agendas=[],
    )


@router.put("/{meeting_id}", response_model=MeetingDetailResponse)
def put_meeting(
    meeting_id: int,
    payload: MeetingUpdateRequest,
    db: Session = Depends(get_session),
    _user=Depends(require_roles(ROLE_ORG_ADMIN, ROLE_ADMIN)),
) -> MeetingDetailResponse:
    meeting = update_meeting(db, meeting_id=meeting_id, payload=payload)
    if meeting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    agendas = list_agendas_by_meeting_id(db, meeting_id)
    return MeetingDetailResponse(
        id=meeting.id or 0,
        title=meeting.title,
        description=meeting.description,
        scheduled_at=meeting.scheduled_at,
        location=meeting.location,
        status=meeting.status,
        meeting_type=_normalize_meeting_type_for_response(meeting.meeting_type),
        meeting_scale=meeting.meeting_scale,
        agendas=[
            MeetingAgendaItemResponse(
                id=agenda.id or 0,
                title=agenda.title,
                responsible=agenda.responsible,
                status=agenda.status,
                order_no=agenda.order_no,
                content=agenda.content,
                pdf_s3_key=agenda.pdf_s3_key,
                pdf_url=agenda.pdf_url,
            )
            for agenda in agendas
        ],
    )


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_meeting(
    meeting_id: int,
    db: Session = Depends(get_session),
    _user=Depends(require_roles(ROLE_ORG_ADMIN, ROLE_ADMIN)),
) -> None:
    try:
        deleted = delete_meeting(db, meeting_id=meeting_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
