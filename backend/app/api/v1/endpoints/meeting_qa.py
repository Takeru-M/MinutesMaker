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
from app.services.rag.ingest import ingest_meeting_knowledge

router = APIRouter(prefix="/meetings", tags=["meeting-qa"])
ADMIN_ROLES = {"platform_admin", "org_admin", "admin"}


def _to_job_status(status_name: str) -> str:
    if status_name in {"queued", "deferred", "scheduled"}:
        return "queued"
    if status_name in {"started"}:
        return "running"
    if status_name in {"finished"}:
        return "finished"
    return "failed"


def _assert_job_access(*, db: Session, job: object, current_user) -> None:
    job_meta = getattr(job, "meta", {})

    requested_by = job_meta.get("requested_by")
    if requested_by is not None and requested_by != (current_user.id or 0) and current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    meeting_id = job_meta.get("meeting_id")
    if isinstance(meeting_id, int) and not can_access_meeting(db, meeting_id=meeting_id, user=current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def _build_qa_response(data: dict, meeting_id: int) -> AssistantQAResponse:
    return AssistantQAResponse(
        meeting_id=meeting_id,
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


@router.post("/{meeting_id}/qa/async", response_model=AssistantQAJobEnqueueResponse, status_code=status.HTTP_202_ACCEPTED)
def enqueue_meeting_qa_job_endpoint(
    meeting_id: int,
    payload: AssistantQARequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("meeting.qa.ask")),
) -> AssistantQAJobEnqueueResponse:
    if not can_access_meeting(db, meeting_id=meeting_id, user=current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    queue = get_qa_queue()
    job = queue.enqueue(
        "app.workers.tasks.run_assistant_qa_job",
        meeting_id=meeting_id,
        user_id=current_user.id or 0,
        question=payload.question,
        job_timeout="300s",
        result_ttl=86400,
        failure_ttl=86400,
    )
    job.meta["requested_by"] = current_user.id or 0
    job.meta["meeting_id"] = meeting_id
    job.meta["job_type"] = "meeting_qa"
    job.save_meta()

    return AssistantQAJobEnqueueResponse(job_id=job.id, status="queued", job_type="meeting_qa")


@router.post(
    "/{meeting_id}/qa/ingest/async",
    response_model=AssistantQAJobEnqueueResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def enqueue_meeting_ingest_job_endpoint(
    meeting_id: int,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("meeting.qa.ingest")),
) -> AssistantQAJobEnqueueResponse:
    if not can_access_meeting(db, meeting_id=meeting_id, user=current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    queue = get_ingest_queue()
    job = queue.enqueue(
        "app.workers.tasks.run_meeting_ingest_job",
        meeting_id=meeting_id,
        job_timeout="1800s",
        result_ttl=86400,
        failure_ttl=86400,
    )
    job.meta["requested_by"] = current_user.id or 0
    job.meta["meeting_id"] = meeting_id
    job.meta["job_type"] = "meeting_ingest"
    job.save_meta()

    return AssistantQAJobEnqueueResponse(job_id=job.id, status="queued", job_type="meeting_ingest")


@router.get("/qa/jobs/{job_id}", response_model=AssistantQAJobStatusResponse)
def get_meeting_qa_job_status_endpoint(
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

    _assert_job_access(db=db, job=job, current_user=current_user)

    normalized_status = _to_job_status(job.get_status(refresh=True))
    job_type = str(job.meta.get("job_type", "unknown"))
    error = job.exc_info if normalized_status == "failed" else None

    qa_result = None
    ingest_result = None
    if normalized_status == "finished" and isinstance(job.result, dict):
        meeting_id = job.meta.get("meeting_id")
        if job_type in {"meeting_qa"} and isinstance(meeting_id, int):
            qa_result = _build_qa_response(job.result, meeting_id)
        elif job_type == "meeting_ingest":
            ingest_result = MeetingKnowledgeIngestResponse(**job.result)

    return AssistantQAJobStatusResponse(
        job_id=job.id,
        status=normalized_status,
        job_type=job_type if job_type in {"meeting_qa", "meeting_ingest"} else "unknown",
        qa_result=qa_result,
        ingest_result=ingest_result,
        error=error,
    )


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


@router.post("/{meeting_id}/qa", response_model=AssistantQAResponse)
def ask_meeting_question_endpoint(
    meeting_id: int,
    payload: AssistantQARequest,
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("meeting.qa.ask")),
) -> AssistantQAResponse:
    try:
        if not can_access_meeting(db, meeting_id=meeting_id, user=current_user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

        result = answer_question_graph(
            db,
            meeting_id=meeting_id,
            user_id=current_user.id or 0,
            question=payload.question,
        )
    except ValueError as exc:
        detail = str(exc)
        if detail == "Meeting not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to answer question") from exc

    return AssistantQAResponse(
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
                source_type=s["source_type"],
                source_entity_id=s["source_entity_id"],
                title=s["title"],
                meeting_id=s.get("meeting_id"),
                score=s["score"],
            )
            for s in result.related_sources
        ],
    )
