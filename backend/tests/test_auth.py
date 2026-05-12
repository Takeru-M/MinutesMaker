"""Tests for auth endpoint business logic (_login_by_roles).

We test the internal function directly with mocked dependencies rather than
going through the HTTP layer, so we can cover all branching without a live DB.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from sqlmodel import Session

from app.api.v1.endpoints.auth import _login_by_roles
from app.core.constants import ROLE_ORG_ADMIN, ROLE_ORG_USER, ROLE_PLATFORM_ADMIN
from app.models.user import User
from app.schemas.auth import LoginRequest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_user(role: str, is_active: bool = True, user_id: int = 1) -> User:
    return User(
        id=user_id,
        username="testuser",
        password_hash="hashed",
        role=role,
        is_active=is_active,
    )


def _make_payload(
    username: str = "testuser",
    password: str = "password",
    organization_id: int | None = None,
) -> LoginRequest:
    return LoginRequest(username=username, password=password, organization_id=organization_id)


ALLOWED_USER_ROLES = (ROLE_ORG_USER, ROLE_ORG_ADMIN)
ALLOWED_ADMIN_ROLES = (ROLE_PLATFORM_ADMIN, ROLE_ORG_ADMIN)


# ---------------------------------------------------------------------------
# User not found / inactive
# ---------------------------------------------------------------------------


class TestUserNotFoundOrInactive:
    @patch("app.api.v1.endpoints.auth.get_user_by_username", return_value=None)
    def test_user_not_found_raises_401(self, _mock):
        db = MagicMock(spec=Session)
        response = MagicMock()
        with pytest.raises(HTTPException) as exc_info:
            _login_by_roles(ALLOWED_USER_ROLES, _make_payload(), db, response)
        assert exc_info.value.status_code == 401

    @patch("app.api.v1.endpoints.auth.get_user_by_username")
    def test_inactive_user_raises_401(self, mock_get):
        mock_get.return_value = _make_user(ROLE_ORG_USER, is_active=False)
        db = MagicMock(spec=Session)
        response = MagicMock()
        with pytest.raises(HTTPException) as exc_info:
            _login_by_roles(ALLOWED_USER_ROLES, _make_payload(), db, response)
        assert exc_info.value.status_code == 401


# ---------------------------------------------------------------------------
# Wrong password
# ---------------------------------------------------------------------------


class TestWrongPassword:
    @patch("app.api.v1.endpoints.auth.verify_password", return_value=False)
    @patch("app.api.v1.endpoints.auth.get_primary_active_membership", return_value=None)
    @patch("app.api.v1.endpoints.auth.get_user_by_username")
    def test_wrong_password_raises_401(self, mock_get, _mock_mem, _mock_pwd):
        mock_get.return_value = _make_user(ROLE_ORG_USER)
        db = MagicMock(spec=Session)
        response = MagicMock()
        with pytest.raises(HTTPException) as exc_info:
            _login_by_roles(ALLOWED_USER_ROLES, _make_payload(), db, response)
        assert exc_info.value.status_code == 401


# ---------------------------------------------------------------------------
# Role mismatch
# ---------------------------------------------------------------------------


class TestRoleMismatch:
    @patch("app.api.v1.endpoints.auth.verify_password", return_value=True)
    @patch("app.api.v1.endpoints.auth.get_primary_active_membership", return_value=None)
    @patch("app.api.v1.endpoints.auth.get_user_by_username")
    def test_role_not_in_allowed_raises_403(self, mock_get, _mock_mem, _mock_pwd):
        # User has org_user role, but endpoint only allows platform_admin
        mock_get.return_value = _make_user(ROLE_ORG_USER)
        db = MagicMock(spec=Session)
        response = MagicMock()
        with pytest.raises(HTTPException) as exc_info:
            _login_by_roles((ROLE_PLATFORM_ADMIN,), _make_payload(), db, response)
        assert exc_info.value.status_code == 403


# ---------------------------------------------------------------------------
# Organization mismatch
# ---------------------------------------------------------------------------


class TestOrganizationMismatch:
    @patch("app.api.v1.endpoints.auth.get_membership", return_value=None)
    @patch("app.api.v1.endpoints.auth.get_user_by_username")
    def test_no_membership_for_org_raises_403(self, mock_get, mock_mem):
        mock_get.return_value = _make_user(ROLE_ORG_USER)
        db = MagicMock(spec=Session)
        response = MagicMock()
        payload = _make_payload(organization_id=99)
        with pytest.raises(HTTPException) as exc_info:
            _login_by_roles(ALLOWED_USER_ROLES, payload, db, response)
        assert exc_info.value.status_code == 403

    @patch("app.api.v1.endpoints.auth.get_user_role_for_organization", return_value=None)
    @patch("app.api.v1.endpoints.auth.get_membership")
    @patch("app.api.v1.endpoints.auth.get_user_by_username")
    def test_role_missing_for_org_raises_403(self, mock_get, mock_mem, mock_role):
        mock_get.return_value = _make_user(ROLE_ORG_USER)
        mock_mem.return_value = MagicMock()  # membership exists
        db = MagicMock(spec=Session)
        response = MagicMock()
        payload = _make_payload(organization_id=1)
        with pytest.raises(HTTPException) as exc_info:
            _login_by_roles(ALLOWED_USER_ROLES, payload, db, response)
        assert exc_info.value.status_code == 403


# ---------------------------------------------------------------------------
# Successful login
# ---------------------------------------------------------------------------


class TestSuccessfulLogin:
    @patch("app.api.v1.endpoints.auth._set_auth_cookies")
    @patch("app.api.v1.endpoints.auth.verify_password", return_value=True)
    @patch("app.api.v1.endpoints.auth.get_primary_active_membership", return_value=None)
    @patch("app.api.v1.endpoints.auth.get_user_by_username")
    def test_login_without_org_returns_user_role(self, mock_get, _mock_mem, _mock_pwd, _mock_cookies):
        mock_get.return_value = _make_user(ROLE_ORG_USER)
        db = MagicMock(spec=Session)
        response = MagicMock()
        result = _login_by_roles(ALLOWED_USER_ROLES, _make_payload(), db, response)
        assert result.role == ROLE_ORG_USER
        assert result.message == "Login succeeded"

    @patch("app.api.v1.endpoints.auth._set_auth_cookies")
    @patch("app.api.v1.endpoints.auth.verify_password", return_value=True)
    @patch("app.api.v1.endpoints.auth.get_user_role_for_organization", return_value=ROLE_ORG_USER)
    @patch("app.api.v1.endpoints.auth.get_primary_active_membership")
    @patch("app.api.v1.endpoints.auth.get_user_by_username")
    def test_login_resolves_role_from_primary_membership(
        self, mock_get, mock_primary, mock_role, _mock_pwd, _mock_cookies
    ):
        mock_get.return_value = _make_user("user")  # legacy role
        mock_primary.return_value = MagicMock(organization_id=5)
        db = MagicMock(spec=Session)
        response = MagicMock()
        result = _login_by_roles(ALLOWED_USER_ROLES, _make_payload(), db, response)
        assert result.role == ROLE_ORG_USER
        assert result.active_organization_id == 5

    @patch("app.api.v1.endpoints.auth._set_auth_cookies")
    @patch("app.api.v1.endpoints.auth.verify_password", return_value=True)
    @patch("app.api.v1.endpoints.auth.get_user_role_for_organization", return_value=ROLE_ORG_ADMIN)
    @patch("app.api.v1.endpoints.auth.get_membership")
    @patch("app.api.v1.endpoints.auth.get_user_by_username")
    def test_login_with_explicit_org_id(self, mock_get, mock_mem, mock_role, _mock_pwd, _mock_cookies):
        mock_get.return_value = _make_user(ROLE_ORG_ADMIN)
        mock_mem.return_value = MagicMock()  # membership exists
        db = MagicMock(spec=Session)
        response = MagicMock()
        payload = _make_payload(organization_id=3)
        result = _login_by_roles(ALLOWED_ADMIN_ROLES, payload, db, response)
        assert result.role == ROLE_ORG_ADMIN
        assert result.active_organization_id == 3

    @patch("app.api.v1.endpoints.auth._set_auth_cookies")
    @patch("app.api.v1.endpoints.auth.verify_password", return_value=True)
    @patch("app.api.v1.endpoints.auth.get_primary_active_membership", return_value=None)
    @patch("app.api.v1.endpoints.auth.get_user_by_username")
    def test_cookies_are_set_on_success(self, mock_get, _mock_mem, _mock_pwd, mock_cookies):
        mock_get.return_value = _make_user(ROLE_ORG_USER)
        db = MagicMock(spec=Session)
        response = MagicMock()
        _login_by_roles(ALLOWED_USER_ROLES, _make_payload(), db, response)
        mock_cookies.assert_called_once()
        _, kwargs = mock_cookies.call_args
        assert "access_token" in kwargs
        assert "refresh_token" in kwargs
