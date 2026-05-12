"""Tests for _get_auth_context in app.core.auth_dependencies.

Priority for active_organization_id resolution:
  1. x-org-id request header (highest)
  2. JWT payload's org_id
  3. primary membership lookup (lowest)

Platform-admin users bypass the membership validation that would otherwise
raise 403 for unknown organizations.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.core.auth_dependencies import _get_auth_context
from app.core.security import create_access_token
from app.models.user import User


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_user(role: str, user_id: int = 1, is_active: bool = True) -> User:
    return User(id=user_id, username="testuser", password_hash="x", role=role, is_active=is_active)


def _make_request(cookie: str | None = None, org_id_header: str | None = None) -> MagicMock:
    req = MagicMock()
    cookies: dict[str, str] = {}
    if cookie is not None:
        cookies["access_token"] = cookie
    req.cookies = cookies

    headers: dict[str, str] = {}
    if org_id_header is not None:
        headers["x-org-id"] = org_id_header
    req.headers = headers
    return req


# ---------------------------------------------------------------------------
# No token
# ---------------------------------------------------------------------------


class TestNoToken:
    def test_missing_cookie_and_credentials_raises_401(self):
        request = _make_request(cookie=None)
        credentials = None
        db = MagicMock()
        with pytest.raises(HTTPException) as exc_info:
            _get_auth_context(request, credentials, db)
        assert exc_info.value.status_code == 401

    def test_bearer_token_used_when_no_cookie(self):
        token = create_access_token(subject="testuser", role="org_user")
        request = _make_request(cookie=None)
        credentials = MagicMock()
        credentials.credentials = token

        user = _make_user("org_user")
        with patch("app.core.auth_dependencies.get_user_by_username", return_value=user), \
             patch("app.core.auth_dependencies.get_primary_active_membership", return_value=None), \
             patch("app.core.auth_dependencies.get_user_role_for_organization", return_value=None):
            db = MagicMock()
            ctx = _get_auth_context(request, credentials, db)
        assert ctx.user.username == "testuser"


# ---------------------------------------------------------------------------
# Invalid / expired tokens
# ---------------------------------------------------------------------------


class TestInvalidToken:
    def test_tampered_token_raises_401(self):
        token = create_access_token(subject="testuser", role="org_user")
        request = _make_request(cookie=token[:-4] + "XXXX")
        db = MagicMock()
        with pytest.raises(HTTPException) as exc_info:
            _get_auth_context(request, None, db)
        assert exc_info.value.status_code == 401

    def test_refresh_token_as_access_token_raises_401(self):
        from app.core.security import create_refresh_token
        token = create_refresh_token(subject="testuser", role="org_user")
        request = _make_request(cookie=token)
        db = MagicMock()
        with pytest.raises(HTTPException) as exc_info:
            _get_auth_context(request, None, db)
        assert exc_info.value.status_code == 401

    def test_user_not_found_raises_401(self):
        token = create_access_token(subject="ghost", role="org_user")
        request = _make_request(cookie=token)
        with patch("app.core.auth_dependencies.get_user_by_username", return_value=None):
            with pytest.raises(HTTPException) as exc_info:
                _get_auth_context(request, None, MagicMock())
        assert exc_info.value.status_code == 401

    def test_inactive_user_raises_401(self):
        token = create_access_token(subject="testuser", role="org_user")
        request = _make_request(cookie=token)
        inactive = _make_user("org_user", is_active=False)
        with patch("app.core.auth_dependencies.get_user_by_username", return_value=inactive):
            with pytest.raises(HTTPException) as exc_info:
                _get_auth_context(request, None, MagicMock())
        assert exc_info.value.status_code == 401


# ---------------------------------------------------------------------------
# org-id resolution priority
# ---------------------------------------------------------------------------


class TestOrgIdResolution:
    def _valid_request_and_user(self, org_id_in_jwt: int | None = None, header: str | None = None):
        token = create_access_token(
            subject="testuser", role="org_user", active_organization_id=org_id_in_jwt
        )
        request = _make_request(cookie=token, org_id_header=header)
        user = _make_user("org_user")
        return request, user

    def test_x_org_id_header_takes_priority_over_jwt(self):
        request, user = self._valid_request_and_user(org_id_in_jwt=1, header="2")
        membership_role = "org_user"
        with patch("app.core.auth_dependencies.get_user_by_username", return_value=user), \
             patch("app.core.auth_dependencies.get_primary_active_membership", return_value=None), \
             patch("app.core.auth_dependencies.get_user_role_for_organization", return_value=membership_role):
            ctx = _get_auth_context(request, None, MagicMock())
        assert ctx.active_organization_id == 2

    def test_jwt_org_id_used_when_no_header(self):
        request, user = self._valid_request_and_user(org_id_in_jwt=5, header=None)
        with patch("app.core.auth_dependencies.get_user_by_username", return_value=user), \
             patch("app.core.auth_dependencies.get_user_role_for_organization", return_value="org_user"), \
             patch("app.core.auth_dependencies.get_primary_active_membership", return_value=None):
            ctx = _get_auth_context(request, None, MagicMock())
        assert ctx.active_organization_id == 5

    def test_primary_membership_used_when_no_header_and_no_jwt_org(self):
        request, user = self._valid_request_and_user(org_id_in_jwt=None, header=None)
        mock_membership = MagicMock()
        mock_membership.organization_id = 7
        with patch("app.core.auth_dependencies.get_user_by_username", return_value=user), \
             patch("app.core.auth_dependencies.get_primary_active_membership", return_value=mock_membership), \
             patch("app.core.auth_dependencies.get_user_role_for_organization", return_value="org_user"):
            ctx = _get_auth_context(request, None, MagicMock())
        assert ctx.active_organization_id == 7

    def test_invalid_x_org_id_header_raises_400(self):
        token = create_access_token(subject="testuser", role="org_user")
        request = _make_request(cookie=token, org_id_header="not-an-int")
        user = _make_user("org_user")
        with patch("app.core.auth_dependencies.get_user_by_username", return_value=user):
            with pytest.raises(HTTPException) as exc_info:
                _get_auth_context(request, None, MagicMock())
        assert exc_info.value.status_code == 400


# ---------------------------------------------------------------------------
# Organization membership validation
# ---------------------------------------------------------------------------


class TestOrgMembershipValidation:
    def test_no_membership_for_active_org_raises_403(self):
        token = create_access_token(subject="testuser", role="org_user", active_organization_id=3)
        request = _make_request(cookie=token)
        user = _make_user("org_user")
        with patch("app.core.auth_dependencies.get_user_by_username", return_value=user), \
             patch("app.core.auth_dependencies.get_user_role_for_organization", return_value=None):
            with pytest.raises(HTTPException) as exc_info:
                _get_auth_context(request, None, MagicMock())
        assert exc_info.value.status_code == 403

    def test_platform_admin_skips_org_membership_check(self):
        token = create_access_token(subject="testuser", role="platform_admin", active_organization_id=99)
        request = _make_request(cookie=token)
        user = _make_user("platform_admin")
        with patch("app.core.auth_dependencies.get_user_by_username", return_value=user), \
             patch("app.core.auth_dependencies.get_user_role_for_organization", return_value=None) as mock_role:
            ctx = _get_auth_context(request, None, MagicMock())
        # platform_admin bypasses the membership check, so role lookup should NOT be called
        mock_role.assert_not_called()
        assert ctx.active_organization_id == 99

    def test_valid_membership_resolves_role(self):
        token = create_access_token(subject="testuser", role="org_user", active_organization_id=3)
        request = _make_request(cookie=token)
        user = _make_user("org_user")
        with patch("app.core.auth_dependencies.get_user_by_username", return_value=user), \
             patch("app.core.auth_dependencies.get_user_role_for_organization", return_value="org_admin"):
            ctx = _get_auth_context(request, None, MagicMock())
        assert ctx.role == "org_admin"
        assert ctx.active_organization_id == 3
