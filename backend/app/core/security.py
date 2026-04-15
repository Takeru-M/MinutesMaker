from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def _build_token_payload(
    *,
    subject: str,
    role: str,
    token_type: str,
    expires_minutes: Optional[int],
    active_organization_id: int | None = None,
) -> dict[str, Any]:
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes or 0)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "token_type": token_type,
        "exp": expire,
    }
    if active_organization_id is not None:
        payload["org_id"] = active_organization_id
    return payload


def create_access_token(
    subject: str,
    role: str,
    expires_minutes: Optional[int] = None,
    active_organization_id: int | None = None,
) -> str:
    payload = _build_token_payload(
        subject=subject,
        role=role,
        token_type="access",
        expires_minutes=expires_minutes or settings.access_token_expire_minutes,
        active_organization_id=active_organization_id,
    )
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(
    subject: str,
    role: str,
    expires_minutes: Optional[int] = None,
    active_organization_id: int | None = None,
) -> str:
    payload = _build_token_payload(
        subject=subject,
        role=role,
        token_type="refresh",
        expires_minutes=expires_minutes or settings.refresh_token_expire_minutes,
        active_organization_id=active_organization_id,
    )
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc


def validate_token_type(payload: dict[str, Any], token_type: str) -> None:
    if payload.get("token_type") != token_type:
        raise ValueError("Invalid token type")
