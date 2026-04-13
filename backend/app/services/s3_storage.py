from dataclasses import dataclass
from datetime import datetime
from urllib.parse import urlparse
from uuid import uuid4

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import settings


_BUCKET_REGION_CACHE: dict[str, str] = {}


@dataclass(frozen=True)
class UploadedFile:
    s3_key: str
    url: str


def build_public_s3_url(*, s3_key: str) -> str:
    bucket = settings.aws_s3_bucket.strip()
    if not bucket:
        raise ValueError("AWS_S3_BUCKET is not configured")
    return _build_public_url(bucket=bucket, key=s3_key)


def build_signed_s3_url(*, s3_key: str, expires_in: int | None = None) -> str:
    bucket = settings.aws_s3_bucket.strip()
    if not bucket:
        raise ValueError("AWS_S3_BUCKET is not configured")

    effective_expires = expires_in or settings.aws_s3_presigned_expires_seconds
    if effective_expires <= 0:
        raise ValueError("AWS_S3_PRESIGNED_EXPIRES_SECONDS must be greater than 0")

    client = _create_s3_client()
    try:
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": s3_key},
            ExpiresIn=effective_expires,
            HttpMethod="GET",
        )
    except ClientError as exc:
        error = exc.response.get("Error", {}) if isinstance(exc.response, dict) else {}
        code = str(error.get("Code") or "ClientError")
        message = str(error.get("Message") or "Failed to generate presigned URL")
        raise ValueError(f"S3 presign failed ({code}): {message}") from exc


def upload_agenda_pdf(*, file_bytes: bytes, filename: str, content_type: str = "application/pdf") -> UploadedFile:
    bucket = settings.aws_s3_bucket.strip()
    if not bucket:
        raise ValueError("AWS_S3_BUCKET is not configured")

    key = _build_pdf_key(filename, prefix="agendas")
    client = _create_s3_client()
    try:
        client.put_object(
            Bucket=bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
    except ClientError as exc:
        raise ValueError(_format_s3_upload_error(exc=exc, bucket=bucket, key=key)) from exc
    return UploadedFile(s3_key=key, url=_build_public_url(bucket=bucket, key=key))


def upload_minutes_pdf(*, file_bytes: bytes, filename: str, content_type: str = "application/pdf") -> UploadedFile:
    bucket = settings.aws_s3_bucket.strip()
    if not bucket:
        raise ValueError("AWS_S3_BUCKET is not configured")

    key = _build_pdf_key(filename, prefix="minutes")
    client = _create_s3_client()
    try:
        client.put_object(
            Bucket=bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
    except ClientError as exc:
        raise ValueError(_format_s3_upload_error(exc=exc, bucket=bucket, key=key)) from exc
    return UploadedFile(s3_key=key, url=_build_public_url(bucket=bucket, key=key))


def _create_s3_client():
    kwargs = {
        "region_name": settings.aws_region,
        "config": Config(signature_version="s3v4"),
    }
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    if settings.aws_s3_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_s3_endpoint_url

    return boto3.client("s3", **kwargs)


def _build_pdf_key(filename: str, *, prefix: str) -> str:
    ext = ".pdf" if not filename.lower().endswith(".pdf") else ""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    return f"{prefix}/{timestamp}-{uuid4().hex}{ext}"


def _build_public_url(*, bucket: str, key: str) -> str:
    bucket_region = _get_bucket_region(bucket)

    if settings.aws_s3_public_base_url:
        base_url = settings.aws_s3_public_base_url.rstrip("/")
        parsed = urlparse(base_url)

        if parsed.netloc == "s3.amazonaws.com":
            return _build_aws_public_url(bucket=bucket, key=key, region=bucket_region)

        if "{bucket}" in base_url:
            return f"{base_url.format(bucket=bucket)}/{key}"

        return f"{base_url}/{key}"

    region = settings.aws_region
    endpoint = settings.aws_s3_endpoint_url
    if endpoint:
        endpoint_url = endpoint.rstrip("/")
        parsed = urlparse(endpoint_url)
        if parsed.netloc == "s3.amazonaws.com":
            return _build_aws_public_url(bucket=bucket, key=key, region=bucket_region)
        return f"{endpoint_url}/{bucket}/{key}"
    return _build_aws_public_url(bucket=bucket, key=key, region=bucket_region)


def _build_aws_public_url(*, bucket: str, key: str, region: str) -> str:
    return f"https://{bucket}.s3.amazonaws.com/{key}"


def _get_bucket_region(bucket: str) -> str:
    cached = _BUCKET_REGION_CACHE.get(bucket)
    if cached:
        return cached

    try:
        client = _create_s3_client()
        response = client.get_bucket_location(Bucket=bucket)
        location_constraint = response.get("LocationConstraint")
        region = _normalize_bucket_region(location_constraint)
    except Exception:
        region = settings.aws_region

    _BUCKET_REGION_CACHE[bucket] = region
    return region


def _normalize_bucket_region(location_constraint: str | None) -> str:
    if not location_constraint:
        return "us-east-1"
    if location_constraint == "EU":
        return "eu-west-1"
    return location_constraint


def _format_s3_upload_error(*, exc: ClientError, bucket: str, key: str) -> str:
    error = exc.response.get("Error", {}) if isinstance(exc.response, dict) else {}
    code = str(error.get("Code") or "ClientError")
    message = str(error.get("Message") or "S3 upload failed")

    if code == "AccessDenied":
        return (
            "S3 AccessDenied: missing permission for s3:PutObject on "
            f"arn:aws:s3:::{bucket}/{key}"
        )

    return f"S3 upload failed ({code}): {message}"
