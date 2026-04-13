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
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    validate_token_type,
    verify_password,
)
from app.crud.user import get_user_by_username
from app.db.session import get_session
from app.schemas.auth import CurrentUserResponse, LoginRequest, LoginResponse, RefreshResponse

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

    if user.role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role mismatch")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access_token = create_access_token(subject=user.username, role=user.role)
    refresh_token = create_refresh_token(subject=user.username, role=user.role)
    _set_auth_cookies(response, access_token=access_token, refresh_token=refresh_token)
    return LoginResponse(message="Login succeeded", role=user.role)


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
    if not username or not role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = get_user_by_username(db, username)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    access_token = create_access_token(subject=user.username, role=user.role)
    refresh_token_next = create_refresh_token(subject=user.username, role=user.role)
    _set_auth_cookies(response, access_token=access_token, refresh_token=refresh_token_next)
    return RefreshResponse(message="Token refreshed")


@router.post("/logout")
def logout(response: Response) -> dict[str, str]:
    _clear_auth_cookies(response)
    return {"message": "Logged out"}


@router.get("/me", response_model=CurrentUserResponse)
def me(
    current_user=Depends(get_current_user),
) -> CurrentUserResponse:
    return CurrentUserResponse(id=current_user.id or 0, username=current_user.username, role=current_user.role)
