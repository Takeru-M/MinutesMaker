from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.auth_dependencies import require_permissions
from app.db.session import get_session
from app.schemas.meeting_qa import (
    MeetingKnowledgeIngestResponse,
    MeetingQACitationResponse,
    MeetingQARequest,
    MeetingQARelatedSourceResponse,
    MeetingQAResponse,
)
from app.services.meeting_access import can_access_meeting
from app.services.rag.graph import answer_meeting_question_graph
from app.services.rag.ingest import ingest_meeting_knowledge

router = APIRouter(prefix="/meetings", tags=["meeting-qa"])


@router.post("/{meeting_id}/qa/ingest", response_model=MeetingKnowledgeIngestResponse)
def ingest_meeting_knowledge_endpoint(
    meeting_id: int,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("meeting.qa.ingest")),
) -> MeetingKnowledgeIngestResponse:
    try:
        if not can_access_meeting(db, meeting_id=meeting_id, user=current_user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

        result = ingest_meeting_knowledge(db, meeting_id)
    except ValueError as exc:
        detail = str(exc)
        if detail == "Meeting not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to ingest meeting knowledge") from exc

    return MeetingKnowledgeIngestResponse(
        meeting_id=result.meeting_id,
        indexed_sources=result.indexed_sources,
        indexed_chunks=result.indexed_chunks,
        skipped_sources=result.skipped_sources,
    )


@router.post("/{meeting_id}/qa", response_model=MeetingQAResponse)
def ask_meeting_question_endpoint(
    meeting_id: int,
    payload: MeetingQARequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("meeting.qa.ask")),
) -> MeetingQAResponse:
    try:
        if not can_access_meeting(db, meeting_id=meeting_id, user=current_user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

        result = answer_meeting_question_graph(
            db,
            meeting_id=meeting_id,
            user_id=current_user.id or 0,
            question=payload.question,
            scope=payload.scope,
            intent=payload.intent,
        )
    except ValueError as exc:
        detail = str(exc)
        if detail == "Meeting not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to answer question") from exc

    return MeetingQAResponse(
        meeting_id=meeting_id,
        question=payload.question,
        intent=result.intent,
        scope=result.scope,
        answer=result.answer,
        model_name=result.model_name,
        confidence=result.confidence,
        citations=[
            MeetingQACitationResponse(
                chunk_id=c.chunk_id,
                source_type=c.source_type,
                source_entity_id=c.source_entity_id,
                chunk_index=c.chunk_index,
                score=c.score,
                snippet=c.snippet,
            )
            for c in result.citations
        ],
        related_sources=[
            MeetingQARelatedSourceResponse(
                source_type=source["source_type"],
                source_entity_id=source["source_entity_id"],
                title=source["title"],
                meeting_id=source["meeting_id"],
                score=source["score"],
            )
            for source in result.related_sources
        ],
    )
