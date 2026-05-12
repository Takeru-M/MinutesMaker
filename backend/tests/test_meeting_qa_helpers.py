"""Tests for helper functions in app.api.v1.endpoints.meeting_qa."""
from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.meeting_qa import (
    _assert_job_access,
    _build_qa_response,
    _to_job_status,
)
from app.models.user import User


# ---------------------------------------------------------------------------
# _to_job_status
# ---------------------------------------------------------------------------


class TestToJobStatus:
    @pytest.mark.parametrize("rq_status", ["queued", "deferred", "scheduled"])
    def test_pending_like_statuses_map_to_queued(self, rq_status: str):
        assert _to_job_status(rq_status) == "queued"

    def test_started_maps_to_running(self):
        assert _to_job_status("started") == "running"

    def test_finished_maps_to_finished(self):
        assert _to_job_status("finished") == "finished"

    @pytest.mark.parametrize("rq_status", ["failed", "stopped", "canceled", "unknown_state"])
    def test_anything_else_maps_to_failed(self, rq_status: str):
        assert _to_job_status(rq_status) == "failed"


# ---------------------------------------------------------------------------
# _assert_job_access
# ---------------------------------------------------------------------------


def _make_user(user_id: int, role: str) -> User:
    return User(id=user_id, username=f"u{user_id}", password_hash="x", role=role, is_active=True)


def _make_job(requested_by: int | None) -> MagicMock:
    job = MagicMock()
    job.meta = {} if requested_by is None else {"requested_by": requested_by}
    return job


class TestAssertJobAccess:
    def test_job_owner_can_access(self):
        user = _make_user(1, "org_user")
        job = _make_job(requested_by=1)
        _assert_job_access(db=MagicMock(), job=job, current_user=user)  # no exception

    def test_other_user_without_admin_role_raises_403(self):
        user = _make_user(2, "org_user")
        job = _make_job(requested_by=1)
        with pytest.raises(HTTPException) as exc_info:
            _assert_job_access(db=MagicMock(), job=job, current_user=user)
        assert exc_info.value.status_code == 403

    @pytest.mark.parametrize("role", ["platform_admin", "org_admin", "admin"])
    def test_admin_roles_can_access_any_job(self, role: str):
        user = _make_user(99, role)
        job = _make_job(requested_by=1)
        _assert_job_access(db=MagicMock(), job=job, current_user=user)  # no exception

    def test_no_requested_by_meta_allows_any_user(self):
        user = _make_user(5, "org_user")
        job = _make_job(requested_by=None)
        _assert_job_access(db=MagicMock(), job=job, current_user=user)  # no exception


# ---------------------------------------------------------------------------
# _build_qa_response
# ---------------------------------------------------------------------------


class TestBuildQaResponse:
    def _minimal_data(self) -> dict:
        return {
            "question": "What happened?",
            "intent": "lookup",
            "scope": "global",
            "answer": "Nothing much.",
            "model_name": "gpt-4",
            "confidence": 0.9,
        }

    def test_builds_response_without_citations_or_sources(self):
        data = self._minimal_data()
        resp = _build_qa_response(data, meeting_id=1)
        assert resp.question == "What happened?"
        assert resp.answer == "Nothing much."
        assert resp.confidence == 0.9
        assert resp.citations == []
        assert resp.related_sources == []
        assert resp.meeting_id == 1

    def test_none_meeting_id_is_preserved(self):
        data = self._minimal_data()
        resp = _build_qa_response(data, meeting_id=None)
        assert resp.meeting_id is None

    def test_citations_are_mapped(self):
        data = {
            **self._minimal_data(),
            "citations": [
                {
                    "chunk_id": 10,
                    "source_type": "minutes",
                    "source_entity_id": 5,
                    "chunk_index": 2,
                    "score": 0.85,
                    "snippet": "Action items discussed.",
                }
            ],
        }
        resp = _build_qa_response(data, meeting_id=1)
        assert len(resp.citations) == 1
        c = resp.citations[0]
        assert c.chunk_id == 10
        assert c.source_type == "minutes"
        assert c.score == 0.85
        assert c.snippet == "Action items discussed."

    def test_related_sources_are_mapped(self):
        data = {
            **self._minimal_data(),
            "related_sources": [
                {
                    "source_type": "agenda",
                    "source_entity_id": 3,
                    "title": "Budget discussion",
                    "meeting_id": 2,
                    "score": 0.7,
                }
            ],
        }
        resp = _build_qa_response(data, meeting_id=1)
        assert len(resp.related_sources) == 1
        s = resp.related_sources[0]
        assert s.source_type == "agenda"
        assert s.title == "Budget discussion"
        assert s.meeting_id == 2
