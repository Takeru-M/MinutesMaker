from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.core.config import settings
from app.core.constants import ROLE_CANONICAL_MAP
from app.core.security import decode_token, validate_token_type
from app.crud.user import get_user_by_username
from app.db.session import get_session
from app.models.user import User

security = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_session),
) -> User:
    token = request.cookies.get(settings.access_cookie_name)

    if token is None and credentials is not None:
        token = credentials.credentials

    if token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = decode_token(token)
        validate_token_type(payload, "access")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = get_user_by_username(db, username)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


def require_roles(*allowed_roles: str) -> Callable[..., User]:
    def dependency(user: User = Depends(get_current_user)) -> User:
        canonical_allowed_roles = {ROLE_CANONICAL_MAP.get(role, role) for role in allowed_roles}
        canonical_user_role = ROLE_CANONICAL_MAP.get(user.role, user.role)

        if canonical_user_role not in canonical_allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return dependency
