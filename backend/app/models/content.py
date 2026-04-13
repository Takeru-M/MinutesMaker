from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint
from sqlmodel import Field, SQLModel


class Content(SQLModel, table=True):
    __tablename__ = "contents"
    __table_args__ = (
        CheckConstraint("content_type IN ('repository', 'guide')", name="ck_contents_content_type"),
        CheckConstraint("status IN ('draft', 'published', 'archived')", name="ck_contents_status"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    content_type: str = Field(nullable=False, index=True)
    title: str = Field(nullable=False, index=True)
    content: str = Field(default="", nullable=False)
    status: str = Field(default="draft", nullable=False, index=True)
    created_by: int = Field(foreign_key="user.id", nullable=False, index=True)
    updated_by: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    deleted_at: Optional[datetime] = Field(default=None)


class ContentAttachment(SQLModel, table=True):
    __tablename__ = "content_attachments"

    id: Optional[int] = Field(default=None, primary_key=True)
    content_id: int = Field(foreign_key="contents.id", nullable=False, index=True)
    file_name: str = Field(nullable=False)
    s3_key: str = Field(nullable=False, unique=True)
    file_size: int = Field(nullable=False)
    mime_type: str = Field(default="application/pdf", nullable=False)
    order_no: int = Field(default=0, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
