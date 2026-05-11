"""
RQ Dashboard configuration for worker monitoring.

Provides setup instructions and basic monitoring endpoints.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.auth_dependencies import require_permissions
from app.core.job_queue import get_qa_queue, get_ingest_queue, get_low_queue
from app.db.session import get_session

router = APIRouter(prefix="/admin/operations", tags=["operations"])


class JobQueueMetrics:
    """Simple metrics for job queues."""

    def __init__(self, queue_name: str):
        self.queue_name = queue_name
        if queue_name == "qa":
            self.queue = get_qa_queue()
        elif queue_name == "ingest":
            self.queue = get_ingest_queue()
        else:
            self.queue = get_low_queue()

    def get_queue_stats(self) -> dict:
        """Get basic queue statistics."""
        return {
            "queue_name": self.queue_name,
            "job_count": len(self.queue),
            "started_job_registry_count": len(self.queue.started_job_registry),
            "finished_job_registry_count": len(self.queue.finished_job_registry),
            "failed_job_registry_count": len(self.queue.failed_job_registry),
            "deferred_job_registry_count": len(self.queue.deferred_job_registry),
            "scheduled_job_registry_count": len(self.queue.scheduled_job_registry),
        }


@router.get("/queues/stats")
def get_queues_stats(
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("meeting.qa.ingest")),
) -> dict:
    """Get statistics for all job queues. Requires QA ingest permission."""
    stats = {
        "qa": JobQueueMetrics("qa").get_queue_stats(),
        "ingest": JobQueueMetrics("ingest").get_queue_stats(),
        "low": JobQueueMetrics("low").get_queue_stats(),
    }
    return stats


@router.get("/health/workers")
def get_worker_health(
    db: Session = Depends(get_session),
    current_user=Depends(require_permissions("meeting.qa.ingest")),
) -> dict:
    """Get health status of worker processes."""
    # Note: This is a placeholder. Real implementation would check worker heartbeats.
    return {
        "status": "healthy",
        "message": "Workers are running. Use RQ dashboard at /rq for detailed monitoring.",
        "dashboard_url": "/rq",
        "queues": ["qa", "ingest", "low"],
    }
