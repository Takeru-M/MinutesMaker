from sqlmodel import Session, select

from app.core.constants import (
    ROLE_ADMIN,
    ROLE_AUDITOR,
    ROLE_CANONICAL_MAP,
    ROLE_ORG_ADMIN,
    ROLE_ORG_USER,
    ROLE_PLATFORM_ADMIN,
)
from app.models.meeting import Meeting, MeetingAttendee
from app.models.user import User
from app.crud.organization import get_primary_active_membership

_PLATFORM_ADMIN_ROLES = frozenset({ROLE_ADMIN, ROLE_PLATFORM_ADMIN, "admin", "platform_admin"})
_ORG_ADMIN_ROLES = frozenset({ROLE_ORG_ADMIN, "org_admin"})
_FULL_READ_ROLES = frozenset({ROLE_ORG_USER, ROLE_AUDITOR, "user", "org_user", "auditor"})


def can_access_meeting(
    session: Session,
    *,
    meeting_id: int,
    user: User,
    active_org_id: int | None = None,
    canonical_role: str | None = None,
) -> bool:
    role = canonical_role or ROLE_CANONICAL_MAP.get(user.role, user.role)

    if role in _PLATFORM_ADMIN_ROLES:
        return True

    # org_user / auditor already passed the permission check at the endpoint level
    if role in _FULL_READ_ROLES:
        return True

    meeting = session.exec(select(Meeting).where(Meeting.id == meeting_id)).first()
    if meeting is None:
        return False

    if role in _ORG_ADMIN_ROLES:
        org_id = active_org_id
        if org_id is None:
            primary_membership = get_primary_active_membership(session, user.id or 0)
            org_id = primary_membership.organization_id if primary_membership else None
        # Allow when meeting is not yet scoped to an org, or org matches
        if meeting.organization_id is None or (org_id and meeting.organization_id == org_id):
            return True

    if meeting.created_by == (user.id or 0):
        return True

    attendee = session.exec(
        select(MeetingAttendee).where(
            MeetingAttendee.meeting_id == meeting_id,
            MeetingAttendee.user_id == (user.id or 0),
            MeetingAttendee.status != "declined",
        )
    ).first()
    return attendee is not None
