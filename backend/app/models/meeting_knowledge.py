from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, CheckConstraint, Column, Text, UniqueConstraint
from sqlmodel import Field, SQLModel


class MeetingKnowledgeSource(SQLModel, table=True):
    __tablename__ = "meeting_knowledge_sources"
    __table_args__ = (
        CheckConstraint(
            "source_type IN ('meeting', 'agenda', 'minutes', 'notice', 'content', 'content_attachment')",
            name="ck_meeting_knowledge_sources_source_type",
        ),
        UniqueConstraint(
            "meeting_id",
            "source_type",
            "source_entity_id",
            "version_tag",
            name="uq_meeting_knowledge_sources_entity_version",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    meeting_id: int = Field(foreign_key="meetings.id", nullable=False, index=True)
    source_type: str = Field(nullable=False, index=True)
    source_entity_id: int = Field(nullable=False, index=True)
    source_label: Optional[str] = Field(default=None)
    source_uri: Optional[str] = Field(default=None)
    version_tag: str = Field(default="v1", nullable=False, index=True)
    content_hash: Optional[str] = Field(default=None, index=True)
    last_synced_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class MeetingKnowledgeChunk(SQLModel, table=True):
    __tablename__ = "meeting_knowledge_chunks"
    __table_args__ = (
        UniqueConstraint(
            "source_id",
            "chunk_index",
            name="uq_meeting_knowledge_chunks_source_chunk_index",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    meeting_id: int = Field(foreign_key="meetings.id", nullable=False, index=True)
    source_id: int = Field(foreign_key="meeting_knowledge_sources.id", nullable=False, index=True)
    chunk_index: int = Field(nullable=False)
    chunk_text: str = Field(default="", sa_column=Column(Text, nullable=False))
    token_count: int = Field(default=0, nullable=False)
    embedding_model: str = Field(nullable=False)
    embedding_vector_id: str = Field(nullable=False, index=True, unique=True)
    metadata_json: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class MeetingQALog(SQLModel, table=True):
    __tablename__ = "meeting_qa_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    meeting_id: int = Field(foreign_key="meetings.id", nullable=False, index=True)
    user_id: int = Field(foreign_key="user.id", nullable=False, index=True)
    question: str = Field(default="", sa_column=Column(Text, nullable=False))
    answer: str = Field(default="", sa_column=Column(Text, nullable=False))
    retrieved_chunk_ids: list[int] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    model_name: Optional[str] = Field(default=None, index=True)
    prompt_tokens: Optional[int] = Field(default=None)
    completion_tokens: Optional[int] = Field(default=None)
    total_tokens: Optional[int] = Field(default=None)
    latency_ms: Optional[int] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)
