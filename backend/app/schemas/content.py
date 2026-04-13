from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class ContentItemResponse(BaseModel):
    db_id: int
    id: str
    title: str
    author: str
    date: date


class ContentAttachmentResponse(BaseModel):
    id: int
    file_name: str
    s3_key: str
    file_size: int
    mime_type: str
    order_no: int
    created_at: datetime


class ContentDetailResponse(BaseModel):
    id: int
    content_type: str
    title: str
    content: str
    status: str
    created_by_name: str
    updated_by: Optional[int]
    created_at: datetime
    updated_at: datetime
    attachments: list[ContentAttachmentResponse] = []

