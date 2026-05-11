import importlib

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.auth_dependencies import require_permissions
from app.core.job_queue import get_ingest_queue, get_qa_queue
from app.core.redis_client import get_redis
from app.db.session import get_session
from app.schemas.meeting_qa import (
    AssistantQAJobEnqueueResponse,
    AssistantQAJobStatusResponse,
    AssistantQARequest,
    AssistantQAResponse,
    MeetingKnowledgeIngestResponse,
    MeetingQACitationResponse,
    MeetingQARelatedSourceResponse,
)
from app.services.meeting_access import can_access_meeting
from app.services.rag.graph import answer_question_graph
from app.services.rag.ingest import ingest_global_knowledge, ingest_meeting_knowledge

router = APIRouter(prefix="/assistant", tags=["assistant"])
ADMIN_ROLES = {"platform_admin", "org_admin", "admin"}


def _to_job_status(status_name: str) -> str:
    if status_name in {"queued", "deferred", "scheduled"}:
        return "queued"
    if status_name in {"started"}:
        return "running"
    if status_name in {"finished"}:
        return "finished"
    return "failed"


def _build_qa_response(data: dict) -> AssistantQAResponse:
    return AssistantQAResponse(
        meeting_id=data.get("meeting_id"),
        question=str(data["question"]),
        intent=str(data["intent"]),
        scope=str(data["scope"]),
        answer=str(data["answer"]),
        model_name=str(data["model_name"]),
        confidence=float(data["confidence"]),
        citations=[
            MeetingQACitationResponse(
                chunk_id=int(c["chunk_id"]),
                source_type=str(c["source_type"]),
                source_entity_id=int(c["source_entity_id"]),
                chunk_index=int(c["chunk_index"]),
                score=float(c["score"]),
                snippet=str(c["snippet"]),
            )
            for c in data.get("citations", [])
        ],
        related_sources=[
            MeetingQARelatedSourceResponse(
                source_type=str(s["source_type"]),
                source_entity_id=int(s["source_entity_id"]),
                title=str(s["title"]),
                meeting_id=s.get("meeting_id"),
                score=float(s["score"]),
            )
            for s in data.get("related_sources", [])
        ],
    )


@router.post("/qa", response_model=AssistantQAResponse)
def ask_assistant_endpoint(
    payload: AssistantQARequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("meeting.qa.ask")),
) -> AssistantQAResponse:
    if payload.meeting_id is not None:
        if not can_access_meeting(db, meeting_id=payload.meeting_id, user=current_user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    try:
        result = answer_question_graph(
            db,
            meeting_id=payload.meeting_id,
            user_id=current_user.id or 0,
            question=payload.question,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to answer question") from exc

    return AssistantQAResponse(
        meeting_id=payload.meeting_id,
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
                source_type=s["source_type"],
                source_entity_id=s["source_entity_id"],
                title=s["title"],
                meeting_id=s.get("meeting_id"),
                score=s["score"],
            )
            for s in result.related_sources
        ],
    )


@router.post("/qa/async", response_model=AssistantQAJobEnqueueResponse, status_code=status.HTTP_202_ACCEPTED)
def enqueue_assistant_qa_job_endpoint(
    payload: AssistantQARequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("meeting.qa.ask")),
) -> AssistantQAJobEnqueueResponse:
    if payload.meeting_id is not None:
        if not can_access_meeting(db, meeting_id=payload.meeting_id, user=current_user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    queue = get_qa_queue()
    job = queue.enqueue(
        "app.workers.tasks.run_assistant_qa_job",
        meeting_id=payload.meeting_id,
        user_id=current_user.id or 0,
        question=payload.question,
        job_timeout="300s",
        result_ttl=86400,
        failure_ttl=86400,
    )
    job.meta["requested_by"] = current_user.id or 0
    job.meta["meeting_id"] = payload.meeting_id
    job.meta["job_type"] = "assistant_qa"
    job.save_meta()

    return AssistantQAJobEnqueueResponse(job_id=job.id, status="queued", job_type="assistant_qa")


@router.post("/ingest/async", response_model=AssistantQAJobEnqueueResponse, status_code=status.HTTP_202_ACCEPTED)
def enqueue_global_ingest_job_endpoint(
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("meeting.qa.ingest")),
) -> AssistantQAJobEnqueueResponse:
    queue = get_ingest_queue()
    job = queue.enqueue(
        "app.workers.tasks.run_global_ingest_job",
        job_timeout="1800s",
        result_ttl=86400,
        failure_ttl=86400,
    )
    job.meta["requested_by"] = current_user.id or 0
    job.meta["job_type"] = "global_ingest"
    job.save_meta()

    return AssistantQAJobEnqueueResponse(job_id=job.id, status="queued", job_type="global_ingest")


@router.post("/ingest", response_model=MeetingKnowledgeIngestResponse)
def ingest_global_knowledge_endpoint(
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("meeting.qa.ingest")),
) -> MeetingKnowledgeIngestResponse:
    try:
        result = ingest_global_knowledge(db)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to ingest global knowledge") from exc

    return MeetingKnowledgeIngestResponse(
        meeting_id=result.meeting_id,
        indexed_sources=result.indexed_sources,
        indexed_chunks=result.indexed_chunks,
        skipped_sources=result.skipped_sources,
    )


@router.get("/qa/jobs/{job_id}", response_model=AssistantQAJobStatusResponse)
def get_assistant_qa_job_status_endpoint(
    job_id: str,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("meeting.qa.ask")),
) -> AssistantQAJobStatusResponse:
    rq_job_module = importlib.import_module("rq.job")
    rq_exceptions_module = importlib.import_module("rq.exceptions")
    Job = getattr(rq_job_module, "Job")
    NoSuchJobError = getattr(rq_exceptions_module, "NoSuchJobError")

    redis_conn = get_redis()
    try:
        job = Job.fetch(job_id, connection=redis_conn)
    except NoSuchJobError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found") from exc

    job_meta = getattr(job, "meta", {})
    requested_by = job_meta.get("requested_by")
    if requested_by is not None and requested_by != (current_user.id or 0) and current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    meeting_id = job_meta.get("meeting_id")
    if isinstance(meeting_id, int) and not can_access_meeting(db, meeting_id=meeting_id, user=current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    normalized_status = _to_job_status(job.get_status(refresh=True))
    job_type = str(job_meta.get("job_type", "unknown"))
    error = job.exc_info if normalized_status == "failed" else None

    qa_result = None
    ingest_result = None
    if normalized_status == "finished" and isinstance(job.result, dict):
        if job_type in {"assistant_qa"}:
            qa_result = _build_qa_response(job.result)
        elif job_type in {"global_ingest"}:
            ingest_result = MeetingKnowledgeIngestResponse(**job.result)

    return AssistantQAJobStatusResponse(
        job_id=job.id,
        status=normalized_status,
        job_type=job_type,
        qa_result=qa_result,
        ingest_result=ingest_result,
        error=error,
    )
