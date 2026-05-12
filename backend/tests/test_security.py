"""Tests for JWT token and password utilities in app.core.security."""
from __future__ import annotations

from datetime import timedelta
from unittest.mock import patch

import pytest
from jose import jwt

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    validate_token_type,
    verify_password,
)


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------


class TestPasswordHashing:
    def test_verify_correct_password(self):
        hashed = get_password_hash("secret123")
        assert verify_password("secret123", hashed) is True

    def test_reject_wrong_password(self):
        hashed = get_password_hash("secret123")
        assert verify_password("wrong", hashed) is False

    def test_hashes_are_not_plaintext(self):
        hashed = get_password_hash("secret123")
        assert hashed != "secret123"

    def test_same_password_yields_different_hashes(self):
        # bcrypt is salted, so identical inputs must not produce identical hashes
        h1 = get_password_hash("password")
        h2 = get_password_hash("password")
        assert h1 != h2


# ---------------------------------------------------------------------------
# create_access_token
# ---------------------------------------------------------------------------


class TestCreateAccessToken:
    def test_token_is_decodable(self):
        token = create_access_token(subject="user01", role="org_user")
        payload = decode_token(token)
        assert payload["sub"] == "user01"

    def test_payload_has_access_type(self):
        token = create_access_token(subject="user01", role="org_user")
        payload = decode_token(token)
        assert payload["token_type"] == "access"

    def test_payload_role_is_preserved(self):
        token = create_access_token(subject="admin01", role="platform_admin")
        payload = decode_token(token)
        assert payload["role"] == "platform_admin"

    def test_org_id_included_when_provided(self):
        token = create_access_token(subject="user01", role="org_user", active_organization_id=42)
        payload = decode_token(token)
        assert payload["org_id"] == 42

    def test_org_id_absent_when_not_provided(self):
        token = create_access_token(subject="user01", role="org_user")
        payload = decode_token(token)
        assert "org_id" not in payload

    def test_custom_expiry_is_applied(self):
        token = create_access_token(subject="user01", role="org_user", expires_minutes=1)
        payload = decode_token(token)
        assert "exp" in payload

    def test_expired_token_raises(self):
        token = create_access_token(subject="user01", role="org_user", expires_minutes=-1)
        with pytest.raises(ValueError, match="Invalid token"):
            decode_token(token)


# ---------------------------------------------------------------------------
# create_refresh_token
# ---------------------------------------------------------------------------


class TestCreateRefreshToken:
    def test_token_has_refresh_type(self):
        token = create_refresh_token(subject="user01", role="org_user")
        payload = decode_token(token)
        assert payload["token_type"] == "refresh"

    def test_subject_and_role_are_in_payload(self):
        token = create_refresh_token(subject="user01", role="org_admin", active_organization_id=5)
        payload = decode_token(token)
        assert payload["sub"] == "user01"
        assert payload["role"] == "org_admin"
        assert payload["org_id"] == 5

    def test_access_and_refresh_tokens_differ(self):
        access = create_access_token(subject="user01", role="org_user")
        refresh = create_refresh_token(subject="user01", role="org_user")
        assert access != refresh


# ---------------------------------------------------------------------------
# decode_token
# ---------------------------------------------------------------------------


class TestDecodeToken:
    def test_valid_token_returns_payload_dict(self):
        token = create_access_token(subject="user01", role="org_user")
        payload = decode_token(token)
        assert isinstance(payload, dict)
        assert payload["sub"] == "user01"

    def test_tampered_token_raises_value_error(self):
        token = create_access_token(subject="user01", role="org_user")
        tampered = token[:-4] + "XXXX"
        with pytest.raises(ValueError, match="Invalid token"):
            decode_token(tampered)

    def test_wrong_secret_raises_value_error(self):
        from app.core.config import settings

        token = jwt.encode(
            {"sub": "user01", "role": "org_user", "token_type": "access"},
            "wrong-secret",
            algorithm=settings.jwt_algorithm,
        )
        with pytest.raises(ValueError, match="Invalid token"):
            decode_token(token)

    def test_garbage_string_raises_value_error(self):
        with pytest.raises(ValueError, match="Invalid token"):
            decode_token("not.a.token")


# ---------------------------------------------------------------------------
# validate_token_type
# ---------------------------------------------------------------------------


class TestValidateTokenType:
    def test_matching_type_does_not_raise(self):
        validate_token_type({"token_type": "access"}, "access")

    def test_mismatched_type_raises(self):
        with pytest.raises(ValueError, match="Invalid token type"):
            validate_token_type({"token_type": "refresh"}, "access")

    def test_missing_type_field_raises(self):
        with pytest.raises(ValueError, match="Invalid token type"):
            validate_token_type({}, "access")
