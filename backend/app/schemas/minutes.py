from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class MinutesCreateRequest(BaseModel):
    """Request model for creating a new minute."""

    title: str = Field(..., min_length=1, max_length=255, description="Title/name of the minute")
    body: Optional[str] = Field(default=None, min_length=1, description="Content of the minute")
    content_type: str = Field(default="text", description="text or pdf")
    pdf_s3_key: Optional[str] = None
    pdf_url: Optional[str] = None


class MinutesResponse(BaseModel):
    """Response model for a minute."""

    id: int
    agenda_id: int
    meeting_id: int
    title: str
    body: str
    content_type: str
    pdf_s3_key: Optional[str] = None
    pdf_url: Optional[str] = None
    status: str
    created_by: int
    approved_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MinutesListResponse(BaseModel):
    """Response model for a list of minutes."""

    total: int
    items: list[MinutesResponse]


class MinutesPdfUploadResponse(BaseModel):
    s3_key: str
    url: str
