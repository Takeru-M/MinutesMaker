from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.core.auth_dependencies import require_roles
from app.core.constants import ROLE_ADMIN, ROLE_AUDITOR, ROLE_ORG_ADMIN, ROLE_USER
from app.crud.meeting import get_meeting_by_id, list_agendas_by_meeting_id, list_meetings
from app.db.session import get_session
from app.schemas.meeting import MeetingAgendaItemResponse, MeetingDetailResponse, MeetingListItemResponse
from app.services.meeting_access import can_access_meeting
from app.services.s3_storage import build_signed_s3_url

router = APIRouter(prefix="/meetings", tags=["meetings"])


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
            meeting_type=meeting.meeting_type,
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
        meeting_type=meeting.meeting_type,
        meeting_scale=meeting.meeting_scale,
        participant_count_planned=meeting.participant_count_planned,
        participant_count_actual=meeting.participant_count_actual,
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
