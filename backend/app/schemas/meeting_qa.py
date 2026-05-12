from typing import Optional

from pydantic import BaseModel, Field


class MeetingKnowledgeIngestResponse(BaseModel):
    meeting_id: Optional[int]
    indexed_sources: int
    indexed_chunks: int
    skipped_sources: int


class AssistantQARequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=4000)
    meeting_id: Optional[int] = None


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
    meeting_id: Optional[int]
    score: float


class AssistantQAResponse(BaseModel):
    meeting_id: Optional[int]
    question: str
    intent: str
    scope: str
    answer: str
    model_name: str
    confidence: float
    citations: list[MeetingQACitationResponse]
    related_sources: list[MeetingQARelatedSourceResponse]


class AssistantQAJobEnqueueResponse(BaseModel):
    job_id: str
    status: str
    job_type: str


class AssistantQAJobStatusResponse(BaseModel):
    job_id: str
    status: str
    job_type: str
    qa_result: Optional[AssistantQAResponse] = None
    ingest_result: Optional[MeetingKnowledgeIngestResponse] = None
    error: Optional[str] = None
