from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


NoticeStatus = Literal["draft", "published", "archived"]
NoticeCategory = Literal["important", "info", "warning"]


class NoticeWriteRequest(BaseModel):
    title: str = Field(min_length=1)
    content: str = Field(default="")
    category: NoticeCategory = Field(default="info")
    status: NoticeStatus = Field(default="draft")
    is_pinned: bool = Field(default=False)
    published_at: Optional[datetime] = None


class NoticeCreateRequest(NoticeWriteRequest):
    pass


class NoticeUpdateRequest(NoticeWriteRequest):
    pass


class NoticeListItemResponse(BaseModel):
    id: int
    title: str
    content: str
    category: NoticeCategory
    created_at: datetime
    published_at: datetime | None


class NoticeAttachmentResponse(BaseModel):
    id: int
    file_name: str
    s3_key: str
    download_url: str
    file_size: int
    mime_type: str
    order_no: int
    created_at: datetime


class NoticeDetailResponse(BaseModel):
    id: int
    title: str
    content: str
    category: NoticeCategory
    created_by_name: str
    published_at: datetime | None
    attachments: list[NoticeAttachmentResponse] = Field(default_factory=list)


class NoticeAdminListItemResponse(BaseModel):
    id: int
    title: str
    content: str
    category: NoticeCategory
    status: NoticeStatus
    is_pinned: bool
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None


class NoticeAdminDetailResponse(BaseModel):
    id: int
    title: str
    content: str
    category: NoticeCategory
    status: NoticeStatus
    is_pinned: bool
    created_by_name: str
    updated_by_name: str | None
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None
    attachments: list[NoticeAttachmentResponse] = Field(default_factory=list)


class NoticeAttachmentUploadResponse(BaseModel):
    attachment: NoticeAttachmentResponse
