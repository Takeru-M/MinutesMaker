"""Tests for can_access_meeting in app.services.meeting_access.

Access rules:
  - platform_admin (and legacy "admin") → always True
  - org_user / auditor → always True (already passed endpoint-level permission gate)
  - org_admin → True when meeting.organization_id is None OR matches the active org
  - meeting creator → True
  - non-declined attendee → True
  - anyone else → False
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from sqlmodel import Session

from app.models.meeting import Meeting, MeetingAttendee
from app.models.user import User
from app.services.meeting_access import can_access_meeting


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_user(user_id: int, role: str) -> User:
    user = User(id=user_id, username=f"user{user_id}", password_hash="x", role=role, is_active=True)
    return user


def _make_meeting(meeting_id: int, created_by: int, organization_id: int | None = None) -> Meeting:
    return Meeting(
        id=meeting_id,
        title="Test Meeting",
        scheduled_at=__import__("datetime").datetime(2026, 4, 10, 18, 0),
        meeting_type="dormitory_general_assembly",
        meeting_scale="large",
        minutes_scope_policy="agenda",
        created_by=created_by,
        organization_id=organization_id,
    )


def _session_returning(first_values: list) -> MagicMock:
    """Build a mock Session whose exec().first() returns values in order."""
    session = MagicMock(spec=Session)
    side_effects = [MagicMock(first=MagicMock(return_value=v)) for v in first_values]
    session.exec.side_effect = side_effects
    return session


# ---------------------------------------------------------------------------
# Platform admin
# ---------------------------------------------------------------------------


class TestPlatformAdmin:
    def test_platform_admin_always_allowed(self):
        user = _make_user(1, "platform_admin")
        session = MagicMock(spec=Session)
        assert can_access_meeting(session, meeting_id=99, user=user) is True
        session.exec.assert_not_called()

    def test_legacy_admin_role_always_allowed(self):
        user = _make_user(1, "admin")
        session = MagicMock(spec=Session)
        assert can_access_meeting(session, meeting_id=99, user=user) is True

    def test_canonical_role_override_as_platform_admin(self):
        user = _make_user(1, "org_user")  # raw role is org_user
        session = MagicMock(spec=Session)
        # canonical_role kwarg overrides user.role
        assert can_access_meeting(session, meeting_id=99, user=user, canonical_role="platform_admin") is True


# ---------------------------------------------------------------------------
# Full-read roles (org_user, auditor)
# ---------------------------------------------------------------------------


class TestFullReadRoles:
    @pytest.mark.parametrize("role", ["org_user", "auditor", "user"])
    def test_full_read_role_always_allowed(self, role: str):
        user = _make_user(2, role)
        session = MagicMock(spec=Session)
        assert can_access_meeting(session, meeting_id=10, user=user) is True
        session.exec.assert_not_called()


# ---------------------------------------------------------------------------
# org_admin: organization-scoped access
# ---------------------------------------------------------------------------


class TestOrgAdmin:
    def test_org_admin_allowed_when_meeting_has_no_org(self):
        user = _make_user(3, "org_admin")
        meeting = _make_meeting(10, created_by=99, organization_id=None)
        session = _session_returning([meeting])
        assert can_access_meeting(session, meeting_id=10, user=user, active_org_id=5) is True

    def test_org_admin_allowed_when_org_matches(self):
        user = _make_user(3, "org_admin")
        meeting = _make_meeting(10, created_by=99, organization_id=5)
        session = _session_returning([meeting])
        assert can_access_meeting(session, meeting_id=10, user=user, active_org_id=5) is True

    def test_org_admin_denied_when_org_mismatches(self):
        user = _make_user(3, "org_admin")
        meeting = _make_meeting(10, created_by=99, organization_id=5)
        # active_org_id=9 does not match meeting.organization_id=5; user did not create meeting
        session = _session_returning([meeting, None])  # second exec for attendee check
        assert can_access_meeting(session, meeting_id=10, user=user, active_org_id=9) is False

    def test_org_admin_resolves_primary_membership_when_no_active_org(self):
        user = _make_user(3, "org_admin")
        meeting = _make_meeting(10, created_by=99, organization_id=5)

        mock_membership = MagicMock()
        mock_membership.organization_id = 5

        session = _session_returning([meeting, None])  # Meeting fetch + attendee
        with patch("app.services.meeting_access.get_primary_active_membership", return_value=mock_membership):
            assert can_access_meeting(session, meeting_id=10, user=user, active_org_id=None) is True

    def test_org_admin_denied_when_no_membership_and_org_mismatch(self):
        user = _make_user(3, "org_admin")
        meeting = _make_meeting(10, created_by=99, organization_id=5)

        mock_membership = MagicMock()
        mock_membership.organization_id = 9  # different org

        session = _session_returning([meeting, None])
        with patch("app.services.meeting_access.get_primary_active_membership", return_value=mock_membership):
            assert can_access_meeting(session, meeting_id=10, user=user, active_org_id=None) is False


# ---------------------------------------------------------------------------
# Meeting not found
# ---------------------------------------------------------------------------


class TestMeetingNotFound:
    @pytest.mark.parametrize("role", ["org_admin", "guest_user"])
    def test_returns_false_when_meeting_missing(self, role: str):
        user = _make_user(1, role)
        session = _session_returning([None])  # Meeting query returns None
        assert can_access_meeting(session, meeting_id=999, user=user) is False


# ---------------------------------------------------------------------------
# Creator access
# ---------------------------------------------------------------------------


class TestCreatorAccess:
    def test_creator_always_allowed(self):
        user = _make_user(7, "guest_user")
        meeting = _make_meeting(10, created_by=7)  # same user id
        session = _session_returning([meeting])
        assert can_access_meeting(session, meeting_id=10, user=user) is True

    def test_non_creator_not_allowed_without_attendee(self):
        user = _make_user(7, "guest_user")
        meeting = _make_meeting(10, created_by=99)  # different creator
        session = _session_returning([meeting, None])  # no attendee record
        assert can_access_meeting(session, meeting_id=10, user=user) is False


# ---------------------------------------------------------------------------
# Attendee access
# ---------------------------------------------------------------------------


class TestAttendeeAccess:
    def test_non_declined_attendee_is_allowed(self):
        user = _make_user(8, "guest_user")
        meeting = _make_meeting(10, created_by=99)
        attendee = MagicMock(spec=MeetingAttendee)

        session = _session_returning([meeting, attendee])
        assert can_access_meeting(session, meeting_id=10, user=user) is True

    def test_declined_attendee_is_denied(self):
        """The SQL query already filters out declined attendees; a None result means denied."""
        user = _make_user(8, "guest_user")
        meeting = _make_meeting(10, created_by=99)

        # The WHERE clause in can_access_meeting excludes declined rows,
        # so the DB returns None — simulate that here.
        session = _session_returning([meeting, None])
        assert can_access_meeting(session, meeting_id=10, user=user) is False

    def test_stranger_is_denied(self):
        user = _make_user(8, "guest_user")
        meeting = _make_meeting(10, created_by=99)
        session = _session_returning([meeting, None])
        assert can_access_meeting(session, meeting_id=10, user=user) is False
