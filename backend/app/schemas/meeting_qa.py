from pydantic import BaseModel, Field
from typing import Literal


class MeetingKnowledgeIngestResponse(BaseModel):
    meeting_id: int
    indexed_sources: int
    indexed_chunks: int
    skipped_sources: int


class MeetingQARequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=4000)
    scope: Literal["meeting_only", "cross_meeting", "global"] = "meeting_only"
    intent: Literal["auto", "context", "lookup", "term"] = "auto"


class MeetingQACitationResponse(BaseModel):
    chunk_id: int
    source_type: str
    source_entity_id: int
    chunk_index: int
    score: float
    snippet: str


class MeetingQARelatedSourceResponse(BaseModel):
    source_type: str
    source_entity_id: int
    title: str
    meeting_id: int
    score: float


class MeetingQAResponse(BaseModel):
    meeting_id: int
    question: str
    intent: str
    scope: str
    answer: str
    model_name: str
    confidence: float
    citations: list[MeetingQACitationResponse]
    related_sources: list[MeetingQARelatedSourceResponse]
