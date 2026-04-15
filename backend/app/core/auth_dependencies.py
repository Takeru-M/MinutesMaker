from collections.abc import Callable
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.core.config import settings
from app.core.constants import ROLE_CANONICAL_MAP, ROLE_PERMISSION_ASSIGNMENTS
from app.core.security import decode_token, validate_token_type
from app.crud.organization import get_primary_active_membership, get_user_role_for_organization
from app.crud.user import get_user_by_username
from app.db.session import get_session
from app.models.user import User

security = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthContext:
    user: User
    role: str
    active_organization_id: int | None


def _canonical_role(role: str) -> str:
    return ROLE_CANONICAL_MAP.get(role, role)


def _get_auth_context(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None,
    db: Session,
) -> AuthContext:
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

    role = _canonical_role(payload.get("role", user.role))
    
    # Priority: x-org-id header > JWT org_id > primary membership
    active_organization_id: int | None = None
    
    # 1. Check x-org-id header (highest priority)
    org_id_header = request.headers.get("x-org-id")
    if org_id_header:
        try:
            active_organization_id = int(org_id_header)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid x-org-id header")
    
    # 2. Fall back to JWT org_id if header not provided
    if active_organization_id is None:
        active_organization_id = payload.get("org_id")
    
    # 3. Fall back to primary membership if neither header nor JWT org_id
    if active_organization_id is None:
        membership = get_primary_active_membership(db, user.id or 0)
        if membership is not None:
            active_organization_id = membership.organization_id
            membership_role = get_user_role_for_organization(
                db,
                user_id=user.id or 0,
                organization_id=membership.organization_id,
            )
            if membership_role:
                role = _canonical_role(membership_role)

    # Validate that user has membership in the active organization
    if active_organization_id is not None:
        membership_role = get_user_role_for_organization(
            db,
            user_id=user.id or 0,
            organization_id=active_organization_id,
        )
        if membership_role is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        role = _canonical_role(membership_role)

    return AuthContext(user=user, role=role, active_organization_id=active_organization_id)


def get_current_auth_context(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_session),
) -> AuthContext:
    return _get_auth_context(request, credentials, db)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_session),
) -> User:
    return _get_auth_context(request, credentials, db).user


def require_roles(*allowed_roles: str) -> Callable[..., User]:
    def dependency(context: AuthContext = Depends(get_current_auth_context)) -> User:
        canonical_allowed_roles = {_canonical_role(role) for role in allowed_roles}
        canonical_user_role = _canonical_role(context.role)

        if canonical_user_role not in canonical_allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return context.user

    return dependency


def require_permissions(*required_permissions: str) -> Callable[..., User]:
    required_permission_set = set(required_permissions)

    def dependency(
        request: Request,
        credentials: HTTPAuthorizationCredentials | None = Depends(security),
        db: Session = Depends(get_session),
    ) -> User:
        context = _get_auth_context(request, credentials, db)
        role_permissions = ROLE_PERMISSION_ASSIGNMENTS.get(_canonical_role(context.role), frozenset())

        if not required_permission_set.issubset(role_permissions):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

        return context.user

    return dependency
