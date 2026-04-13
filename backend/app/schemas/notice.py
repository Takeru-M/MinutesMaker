from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class NoticeListItemResponse(BaseModel):
    id: int
    title: str
    content: str
    category: Literal["important", "info", "warning"]
    created_at: datetime
    published_at: datetime | None


class NoticeDetailResponse(BaseModel):
    id: int
    title: str
    content: str
    category: Literal["important", "info", "warning"]
    created_by_name: str
    published_at: datetime | None
