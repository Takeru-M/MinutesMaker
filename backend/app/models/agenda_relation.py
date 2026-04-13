from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, UniqueConstraint
from sqlmodel import Field, SQLModel


class AgendaRelation(SQLModel, table=True):
    __tablename__ = "agenda_relations"
    __table_args__ = (
        CheckConstraint(
            "relation_type IN ('past_block', 'other_reference')",
            name="ck_agenda_relations_type",
        ),
        UniqueConstraint(
            "source_agenda_id",
            "target_agenda_id",
            "relation_type",
            name="uq_agenda_relations_source_target_type",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    source_agenda_id: int = Field(foreign_key="agendas.id", nullable=False, index=True)
    target_agenda_id: int = Field(foreign_key="agendas.id", nullable=False, index=True)
    relation_type: str = Field(nullable=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
