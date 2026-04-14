from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class MeetingWriteRequest(BaseModel):
    title: str = Field(min_length=1)
    description: Optional[str] = None
    scheduled_at: datetime
    location: Optional[str] = None
    status: str = Field(default="scheduled")
    meeting_type: Literal["dormitory_general_assembly", "block", "department", "committee", "bureau", "annual"]


class MeetingCreateRequest(MeetingWriteRequest):
    pass


class MeetingUpdateRequest(MeetingWriteRequest):
    pass


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
    agendas: list[MeetingAgendaItemResponse]
