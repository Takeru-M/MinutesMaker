from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, UniqueConstraint
from sqlmodel import Field, SQLModel


class Minutes(SQLModel, table=True):
    __tablename__ = "minutes"
    __table_args__ = (
        CheckConstraint("scope_type IN ('meeting', 'agenda')", name="ck_minutes_scope_type"),
        CheckConstraint(
            "status IN ('draft', 'review', 'approved', 'published')",
            name="ck_minutes_status",
        ),
        CheckConstraint(
            "(scope_type = 'meeting' AND agenda_id IS NULL AND scope_entity_id = meeting_id) OR "
            "(scope_type = 'agenda' AND agenda_id IS NOT NULL AND scope_entity_id = agenda_id)",
            name="ck_minutes_scope_consistency",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    meeting_id: int = Field(foreign_key="meetings.id", nullable=False, index=True)
    agenda_id: Optional[int] = Field(default=None, foreign_key="agendas.id", index=True)
    scope_type: str = Field(default="meeting", nullable=False, index=True)
    scope_entity_id: int = Field(nullable=False, index=True)
    title: str = Field(nullable=False)
    body: str = Field(default="", nullable=False)
    content_type: str = Field(default="text", nullable=False, index=True)
    pdf_s3_key: Optional[str] = Field(default=None)
    pdf_url: Optional[str] = Field(default=None)
    status: str = Field(default="draft", nullable=False, index=True)
    created_by: int = Field(foreign_key="user.id", nullable=False, index=True)
    approved_by: Optional[int] = Field(default=None, foreign_key="user.id")
    approved_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    published_at: Optional[datetime] = Field(default=None)
    deleted_at: Optional[datetime] = Field(default=None)


class MinuteRevision(SQLModel, table=True):
    __tablename__ = "minute_revisions"
    __table_args__ = (
        UniqueConstraint("minutes_id", "version_no", name="uq_minute_revisions_minutes_version"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    minutes_id: int = Field(foreign_key="minutes.id", nullable=False, index=True)
    version_no: int = Field(nullable=False)
    body: str = Field(default="", nullable=False)
    change_reason: Optional[str] = Field(default=None)
    changed_by: int = Field(foreign_key="user.id", nullable=False, index=True)
    changed_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
