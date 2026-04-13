from __future__ import annotations

import io
from dataclasses import dataclass

import boto3
from PyPDF2 import PdfReader
from botocore.config import Config

from app.core.config import settings


@dataclass(frozen=True)
class PdfTextResult:
    text: str
    page_count: int


def load_pdf_text_from_s3(s3_key: str) -> PdfTextResult:
    bucket = settings.aws_s3_bucket.strip()
    if not bucket:
        raise ValueError("AWS_S3_BUCKET is not configured")

    client = _create_s3_client()
    response = client.get_object(Bucket=bucket, Key=s3_key)
    pdf_bytes = response["Body"].read()
    return _extract_pdf_text(pdf_bytes)


def _create_s3_client():
    kwargs = {
        # The target S3 bucket is in us-east-1. Force the client region to avoid
        # SignatureDoesNotMatch / AuthorizationHeaderMalformed caused by
        # environment-specific AWS_REGION values.
        "region_name": "us-east-1",
        "config": Config(signature_version="s3v4"),
    }
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    if settings.aws_s3_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_s3_endpoint_url
    return boto3.client("s3", **kwargs)


def _extract_pdf_text(pdf_bytes: bytes) -> PdfTextResult:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages: list[str] = []
    for page in reader.pages:
        extracted = page.extract_text() or ""
        normalized = "\n".join(line.strip() for line in extracted.splitlines() if line.strip())
        if normalized:
            pages.append(normalized)
    return PdfTextResult(text="\n\n".join(pages).strip(), page_count=len(reader.pages))
