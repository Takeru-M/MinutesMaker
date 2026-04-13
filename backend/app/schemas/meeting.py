from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class MeetingAgendaItemResponse(BaseModel):
    id: int
    title: str
    responsible: Optional[str]
    status: str
    order_no: int
    content: Optional[str]
    pdf_s3_key: Optional[str]
    pdf_url: Optional[str]


class MeetingListItemResponse(BaseModel):
    id: int
    title: str
    scheduled_at: datetime
    location: Optional[str]
    meeting_type: str
    meeting_scale: str


class MeetingDetailResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    scheduled_at: datetime
    location: Optional[str]
    status: str
    meeting_type: Literal["dormitory_general_assembly", "block", "department", "committee", "bureau", "annual"]
    meeting_scale: Literal["large", "small"]
    participant_count_planned: Optional[int]
    participant_count_actual: Optional[int]
    agendas: list[MeetingAgendaItemResponse]
