"""Tests for _validate_minutes_payload in app.api.v1.endpoints.minutes.

Validation rules:
  - content_type must be 'text' or 'pdf' (case/whitespace-insensitive)
  - text type: body is required and non-empty
  - pdf type: either pdf_url or pdf_s3_key is required
  - pdf_s3_key, when present, is used to build the canonical public URL
"""
from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.minutes import _validate_minutes_payload
from app.schemas.minutes import MinutesCreateRequest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _payload(
    content_type: str = "text",
    body: str | None = "some body",
    pdf_url: str | None = None,
    pdf_s3_key: str | None = None,
) -> MinutesCreateRequest:
    return MinutesCreateRequest(
        title="Test",
        content_type=content_type,
        body=body,
        pdf_url=pdf_url,
        pdf_s3_key=pdf_s3_key,
    )


# ---------------------------------------------------------------------------
# Invalid content_type
# ---------------------------------------------------------------------------


class TestInvalidContentType:
    def test_unknown_type_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_minutes_payload(_payload(content_type="docx"))
        assert exc_info.value.status_code == 400

    def test_empty_type_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_minutes_payload(_payload(content_type="  "))
        assert exc_info.value.status_code == 400

    def test_content_type_is_case_insensitive(self):
        ct, body, _, _ = _validate_minutes_payload(_payload(content_type="TEXT", body="hello"))
        assert ct == "text"

    def test_content_type_is_stripped(self):
        ct, body, _, _ = _validate_minutes_payload(_payload(content_type=" pdf ", pdf_url="http://example.com/a.pdf"))
        assert ct == "pdf"


# ---------------------------------------------------------------------------
# text type
# ---------------------------------------------------------------------------


class TestTextType:
    def test_text_with_body_returns_normalized_tuple(self):
        ct, body, s3_key, pdf_url = _validate_minutes_payload(_payload(content_type="text", body="  content  "))
        assert ct == "text"
        assert body == "content"
        assert s3_key is None
        assert pdf_url is None

    def test_text_without_body_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_minutes_payload(_payload(content_type="text", body=None))
        assert exc_info.value.status_code == 400

    def test_text_with_whitespace_only_body_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_minutes_payload(_payload(content_type="text", body="   "))
        assert exc_info.value.status_code == 400


# ---------------------------------------------------------------------------
# pdf type
# ---------------------------------------------------------------------------


class TestPdfType:
    def test_pdf_with_url_returns_tuple(self):
        ct, body, s3_key, pdf_url = _validate_minutes_payload(
            _payload(content_type="pdf", body=None, pdf_url="http://example.com/doc.pdf")
        )
        assert ct == "pdf"
        assert body == ""
        assert s3_key is None
        assert pdf_url == "http://example.com/doc.pdf"

    def test_pdf_without_url_and_s3_key_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            _validate_minutes_payload(_payload(content_type="pdf", body=None, pdf_url=None, pdf_s3_key=None))
        assert exc_info.value.status_code == 400

    def test_pdf_with_s3_key_builds_public_url(self):
        with patch(
            "app.api.v1.endpoints.minutes.build_public_s3_url",
            return_value="https://bucket.s3.amazonaws.com/minutes/file.pdf",
        ):
            ct, body, s3_key, pdf_url = _validate_minutes_payload(
                _payload(content_type="pdf", body=None, pdf_s3_key="minutes/file.pdf")
            )
        assert ct == "pdf"
        assert s3_key == "minutes/file.pdf"
        assert pdf_url == "https://bucket.s3.amazonaws.com/minutes/file.pdf"

    def test_pdf_s3_key_build_failure_falls_back_to_pdf_url(self):
        with patch(
            "app.api.v1.endpoints.minutes.build_public_s3_url",
            side_effect=ValueError("no bucket configured"),
        ):
            ct, body, s3_key, pdf_url = _validate_minutes_payload(
                _payload(
                    content_type="pdf",
                    body=None,
                    pdf_s3_key="minutes/file.pdf",
                    pdf_url="http://fallback.example.com/file.pdf",
                )
            )
        assert pdf_url == "http://fallback.example.com/file.pdf"
        assert s3_key == "minutes/file.pdf"
