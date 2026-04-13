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
