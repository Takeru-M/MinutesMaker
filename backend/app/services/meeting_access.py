from sqlmodel import Session, select

from app.models.meeting import Meeting, MeetingAttendee
from app.models.user import User


def can_access_meeting(session: Session, *, meeting_id: int, user: User) -> bool:
    if user.role == "admin":
        return True

    meeting = session.exec(select(Meeting).where(Meeting.id == meeting_id)).first()
    if meeting is None:
        return False

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
