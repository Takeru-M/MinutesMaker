from datetime import date, datetime
from typing import Optional

from sqlalchemy import JSON, CheckConstraint, Column, Text, UniqueConstraint
from sqlmodel import Field, SQLModel


class Agenda(SQLModel, table=True):
    __tablename__ = "agendas"
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'published', 'archived')", name="ck_agendas_status"),
        CheckConstraint("priority BETWEEN 1 AND 5", name="ck_agendas_priority"),
        CheckConstraint("meeting_type IN ('large', 'block', 'annual')", name="ck_agendas_meeting_type"),
        UniqueConstraint("meeting_id", "order_no", name="uq_agendas_meeting_order"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    meeting_id: int = Field(foreign_key="meetings.id", nullable=False, index=True)
    meeting_date: date = Field(nullable=False, index=True)
    meeting_type: str = Field(nullable=False, index=True)
    title: str = Field(nullable=False, index=True)
    responsible: Optional[str] = Field(default=None)
    description: Optional[str] = Field(default=None)
    content: Optional[str] = Field(default=None)
    status: str = Field(default="draft", nullable=False, index=True)
    priority: int = Field(default=3, nullable=False, index=True)
    agenda_types: list[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    voting_items: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    pdf_s3_key: Optional[str] = Field(default=None)
    pdf_url: Optional[str] = Field(default=None)
    order_no: int = Field(default=1, nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    created_by: int = Field(foreign_key="user.id", nullable=False, index=True)
    updated_by: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    published_at: Optional[datetime] = Field(default=None)
    deleted_at: Optional[datetime] = Field(default=None)
