from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.constants import (
    MEETING_TYPE_BLOCK,
    MEETING_TYPE_DORMITORY_GENERAL_ASSEMBLY,
)


class AgendaCreateRequest(BaseModel):
    meeting_date: date
    meeting_type: Literal["dormitory_general_assembly", "block", "annual", "large"]
    title: str = Field(min_length=1)
    responsible: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    status: str = Field(default="draft")
    priority: int = Field(default=3, ge=1, le=5)
    agenda_types: list[str] = Field(default_factory=list)
    voting_items: Optional[str] = None
    pdf_s3_key: Optional[str] = None
    pdf_url: Optional[str] = None
    related_past_agenda_ids: list[int] = Field(default_factory=list)
    related_other_agenda_ids: list[int] = Field(default_factory=list)

    @field_validator("meeting_type", mode="before")
    @classmethod
    def normalize_meeting_type(cls, v: str) -> str:
        normalized = (v or "").strip().lower()
        if normalized == "large":
            return MEETING_TYPE_DORMITORY_GENERAL_ASSEMBLY
        if normalized in {MEETING_TYPE_DORMITORY_GENERAL_ASSEMBLY, MEETING_TYPE_BLOCK, "annual"}:
            return normalized
        return v


class AgendaReadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: int
    meeting_date: date
    meeting_type: str
    title: str
    responsible: Optional[str]
    description: Optional[str]
    content: Optional[str]
    status: str
    priority: int
    agenda_types: list[str]
    voting_items: Optional[str]
    pdf_s3_key: Optional[str]
    pdf_url: Optional[str]
    order_no: int
    is_active: bool
    created_by: int
    updated_by: Optional[int]
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]
    deleted_at: Optional[datetime]


class AgendaListItemResponse(BaseModel):
    id: int
    title: str
    meeting_date: date
    meeting_type: str
    meeting_title: str
    meeting_scheduled_at: datetime


class AgendaSearchItemResponse(BaseModel):
    id: int
    title: str
    meeting_id: int
    meeting_title: str
    meeting_type: str
    meeting_scheduled_at: datetime


class AgendaPdfUploadResponse(BaseModel):
    s3_key: str
    url: str
