from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, UniqueConstraint
from sqlmodel import Field, SQLModel


class Meeting(SQLModel, table=True):
    __tablename__ = "meetings"
    __table_args__ = (
        CheckConstraint("meeting_scale IN ('large', 'small')", name="ck_meetings_scale"),
        CheckConstraint(
            "meeting_type IN ('dormitory_general_assembly', 'block', 'department', 'committee', 'bureau', 'annual')",
            name="ck_meetings_type",
        ),
        CheckConstraint(
            "minutes_scope_policy IN ('agenda', 'meeting')",
            name="ck_meetings_minutes_scope_policy",
        ),
        CheckConstraint(
            "(meeting_scale = 'large' AND minutes_scope_policy = 'agenda' "
            "AND meeting_type IN ('dormitory_general_assembly', 'block', 'annual')) OR "
            "(meeting_scale = 'small' AND minutes_scope_policy = 'meeting' "
            "AND meeting_type IN ('department', 'committee', 'bureau'))",
            name="ck_meetings_scale_type_policy_consistency",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(nullable=False, index=True)
    description: Optional[str] = Field(default=None)
    scheduled_at: datetime = Field(nullable=False, index=True)
    location: Optional[str] = Field(default=None)
    status: str = Field(default="scheduled", nullable=False, index=True)
    meeting_type: str = Field(default="dormitory_general_assembly", nullable=False, index=True)
    meeting_scale: str = Field(default="small", nullable=False, index=True)
    minutes_scope_policy: str = Field(default="meeting", nullable=False, index=True)
    created_by: int = Field(foreign_key="user.id", nullable=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class MeetingAttendee(SQLModel, table=True):
    __tablename__ = "meeting_attendees"
    __table_args__ = (
        CheckConstraint(
            "status IN ('invited', 'attending', 'absent', 'declined')",
            name="ck_meeting_attendees_status",
        ),
        UniqueConstraint("meeting_id", "user_id", name="uq_meeting_attendees_meeting_user"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    meeting_id: int = Field(foreign_key="meetings.id", nullable=False, index=True)
    user_id: int = Field(foreign_key="user.id", nullable=False, index=True)
    status: str = Field(default="invited", nullable=False, index=True)
    added_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
