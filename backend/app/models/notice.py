from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint
from sqlmodel import Field, SQLModel


class Notice(SQLModel, table=True):
    __tablename__ = "notices"
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'published', 'archived')", name="ck_notices_status"),
        CheckConstraint("category IN ('important', 'info', 'warning')", name="ck_notices_category"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(nullable=False, index=True)
    content: str = Field(default="", nullable=False)
    status: str = Field(default="draft", nullable=False, index=True)
    category: str = Field(default="info", nullable=False, index=True)
    is_pinned: bool = Field(default=False, nullable=False)
    created_by: int = Field(foreign_key="user.id", nullable=False, index=True)
    updated_by: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    published_at: Optional[datetime] = Field(default=None)
    deleted_at: Optional[datetime] = Field(default=None)


class NoticeAttachment(SQLModel, table=True):
    __tablename__ = "notice_attachments"

    id: Optional[int] = Field(default=None, primary_key=True)
    notice_id: int = Field(foreign_key="notices.id", nullable=False, index=True)
    file_name: str = Field(nullable=False)
    s3_key: str = Field(nullable=False, unique=True)
    file_size: int = Field(nullable=False)
    mime_type: str = Field(default="application/pdf", nullable=False)
    order_no: int = Field(default=0, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
