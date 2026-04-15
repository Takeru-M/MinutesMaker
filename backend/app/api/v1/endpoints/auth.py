from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlmodel import Session

from app.core.auth_dependencies import get_current_user
from app.core.config import settings
from app.core.constants import (
    LEGACY_ROLE_ADMIN,
    LEGACY_ROLE_USER,
    ROLE_ADMIN,
    ROLE_AUDITOR,
    ROLE_GUEST_USER,
    ROLE_ORG_ADMIN,
    ROLE_USER,
)
from app.crud.organization import (
    get_membership,
    get_primary_active_membership,
    get_user_role_for_organization,
    list_user_memberships_with_details,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    validate_token_type,
    verify_password,
)
from app.crud.user import get_user_by_username
from app.db.session import get_session
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    LoginOptionsResponse,
    LoginResponse,
    MembershipResponse,
    OrganizationResponse,
    RefreshResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(response: Response, *, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.access_cookie_name,
        value=access_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.refresh_token_expire_minutes * 60,
        path="/api/v1/auth",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(key=settings.access_cookie_name, path="/")
    response.delete_cookie(key=settings.refresh_cookie_name, path="/api/v1/auth")


def _login_by_roles(
    allowed_roles: tuple[str, ...],
    payload: LoginRequest,
    db: Session,
    response: Response,
) -> LoginResponse:
    user = get_user_by_username(db, payload.username)

    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    active_organization_id = payload.organization_id
    effective_role = user.role

    if active_organization_id is not None:
        membership = get_membership(db, user_id=user.id or 0, organization_id=active_organization_id)
        if membership is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization mismatch")

        membership_role = get_user_role_for_organization(
            db,
            user_id=user.id or 0,
            organization_id=active_organization_id,
        )
        if membership_role is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization mismatch")
        effective_role = membership_role
    else:
        primary_membership = get_primary_active_membership(db, user.id or 0)
        if primary_membership is not None:
            membership_role = get_user_role_for_organization(
                db,
                user_id=user.id or 0,
                organization_id=primary_membership.organization_id,
            )
            if membership_role is not None:
                effective_role = membership_role
                active_organization_id = primary_membership.organization_id

    if effective_role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role mismatch")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token(
        subject=user.username,
        role=effective_role,
        active_organization_id=active_organization_id,
    )
    refresh_token = create_refresh_token(
        subject=user.username,
        role=effective_role,
        active_organization_id=active_organization_id,
    )
    _set_auth_cookies(response, access_token=access_token, refresh_token=refresh_token)
    return LoginResponse(
        message="Login succeeded",
        role=effective_role,
        active_organization_id=active_organization_id,
    )


@router.post("/login/user", response_model=LoginResponse)
def login_user(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_session),
) -> LoginResponse:
    return _login_by_roles(
        (ROLE_USER, ROLE_GUEST_USER, ROLE_AUDITOR, LEGACY_ROLE_USER),
        payload,
        db,
        response,
    )


@router.post("/login/admin", response_model=LoginResponse)
def login_admin(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_session),
) -> LoginResponse:
    return _login_by_roles((ROLE_ADMIN, ROLE_ORG_ADMIN, LEGACY_ROLE_ADMIN), payload, db, response)


@router.post("/login", response_model=LoginResponse)
def login_any(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_session),
) -> LoginResponse:
    return _login_by_roles(
        (
            ROLE_ADMIN,
            ROLE_ORG_ADMIN,
            ROLE_USER,
            ROLE_GUEST_USER,
            ROLE_AUDITOR,
            LEGACY_ROLE_ADMIN,
            LEGACY_ROLE_USER,
        ),
        payload,
        db,
        response,
    )


@router.post("/login-options", response_model=LoginOptionsResponse)
def login_options(
    payload: LoginRequest,
    db: Session = Depends(get_session),
) -> LoginOptionsResponse:
    user = get_user_by_username(db, payload.username)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    memberships = list_user_memberships_with_details(db, user.id or 0)
    return LoginOptionsResponse(
        memberships=[
            MembershipResponse(
                organization=OrganizationResponse(
                    id=organization.id or 0,
                    name=organization.name,
                    slug=organization.slug,
                ),
                role=membership_role.name,
                is_primary=membership.is_primary,
            )
            for membership, organization, membership_role in memberships
        ]
    )


@router.post("/refresh", response_model=RefreshResponse)
def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_session),
) -> RefreshResponse:
    refresh_token_value = request.cookies.get(settings.refresh_cookie_name)
    if not refresh_token_value:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = decode_token(refresh_token_value)
        validate_token_type(payload, "refresh")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    username = payload.get("sub")
    role = payload.get("role")
    active_organization_id = payload.get("org_id")
    if not username or not role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = get_user_by_username(db, username)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    access_token = create_access_token(
        subject=user.username,
        role=role,
        active_organization_id=active_organization_id,
    )
    refresh_token_next = create_refresh_token(
        subject=user.username,
        role=role,
        active_organization_id=active_organization_id,
    )
    _set_auth_cookies(response, access_token=access_token, refresh_token=refresh_token_next)
    return RefreshResponse(message="Token refreshed")


@router.post("/logout")
def logout(response: Response) -> dict[str, str]:
    _clear_auth_cookies(response)
    return {"message": "Logged out"}


@router.get("/me", response_model=CurrentUserResponse)
def me(
    request: Request,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_session),
) -> CurrentUserResponse:
    active_organization_id = None
    if request is not None:
        token = request.cookies.get(settings.access_cookie_name)
        if token:
            try:
                payload = decode_token(token)
                validate_token_type(payload, "access")
                active_organization_id = payload.get("org_id")
            except ValueError:
                active_organization_id = None

    memberships = list_user_memberships_with_details(db, current_user.id or 0)
    return CurrentUserResponse(
        id=current_user.id or 0,
        username=current_user.username,
        role=current_user.role,
        active_organization_id=active_organization_id,
        memberships=[
            MembershipResponse(
                organization=OrganizationResponse(
                    id=organization.id or 0,
                    name=organization.name,
                    slug=organization.slug,
                ),
                role=membership_role.name,
                is_primary=membership.is_primary,
            )
            for membership, organization, membership_role in memberships
        ],
    )
