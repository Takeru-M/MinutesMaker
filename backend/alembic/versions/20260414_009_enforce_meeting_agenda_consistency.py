"""enforce meeting and agenda consistency constraints

Revision ID: 20260414_009
Revises: 20260412_008
Create Date: 2026-04-14 10:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260414_009"
down_revision: Union[str, None] = "20260412_008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Normalize legacy meeting_type values
    op.execute(
        "UPDATE meetings SET meeting_type = 'dormitory_general_assembly' WHERE meeting_type = 'large'"
    )
    op.execute(
        "UPDATE agendas SET meeting_type = 'dormitory_general_assembly' WHERE meeting_type = 'large'"
    )

    # Align agenda denormalized fields with source meeting before constraints are tightened
    op.execute(
        """
        UPDATE agendas a
        INNER JOIN meetings m ON m.id = a.meeting_id
        SET a.meeting_type = m.meeting_type,
            a.meeting_date = DATE(m.scheduled_at)
        """
    )

    # 2) Tighten meetings constraints
    op.drop_constraint("ck_meetings_scale", "meetings", type_="check")
    op.drop_constraint("ck_meetings_type", "meetings", type_="check")

    op.create_check_constraint(
        "ck_meetings_scale",
        "meetings",
        "meeting_scale IN ('large', 'small')",
    )
    op.create_check_constraint(
        "ck_meetings_type",
        "meetings",
        "meeting_type IN ('dormitory_general_assembly', 'block', 'department', 'committee', 'bureau', 'annual')",
    )
    op.create_check_constraint(
        "ck_meetings_scale_type_policy_consistency",
        "meetings",
        "(meeting_scale = 'large' AND minutes_scope_policy = 'agenda' "
        "AND meeting_type IN ('dormitory_general_assembly', 'block', 'annual')) OR "
        "(meeting_scale = 'small' AND minutes_scope_policy = 'meeting' "
        "AND meeting_type IN ('department', 'committee', 'bureau'))",
    )

    # Composite referenced index for FK (meeting_id, meeting_type)
    op.create_index(
        "ix_meetings_id_meeting_type",
        "meetings",
        ["id", "meeting_type"],
        unique=False,
    )

    # 3) Tighten agendas constraints and tie agenda type to meeting type
    op.drop_constraint("ck_agendas_meeting_type", "agendas", type_="check")
    op.create_check_constraint(
        "ck_agendas_meeting_type",
        "agendas",
        "meeting_type IN ('dormitory_general_assembly', 'block', 'annual')",
    )

    op.create_foreign_key(
        "fk_agendas_meeting_id_meeting_type",
        "agendas",
        "meetings",
        ["meeting_id", "meeting_type"],
        ["id", "meeting_type"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_agendas_meeting_id_meeting_type", "agendas", type_="foreignkey")

    op.drop_constraint("ck_agendas_meeting_type", "agendas", type_="check")
    op.create_check_constraint(
        "ck_agendas_meeting_type",
        "agendas",
        "meeting_type IN ('large', 'block', 'annual')",
    )

    op.drop_index("ix_meetings_id_meeting_type", table_name="meetings")

    op.drop_constraint("ck_meetings_scale_type_policy_consistency", "meetings", type_="check")
    op.drop_constraint("ck_meetings_type", "meetings", type_="check")
    op.drop_constraint("ck_meetings_scale", "meetings", type_="check")

    op.create_check_constraint(
        "ck_meetings_scale",
        "meetings",
        "meeting_scale IN ('large', 'medium', 'small')",
    )
    op.create_check_constraint(
        "ck_meetings_type",
        "meetings",
        "meeting_type IN ('large', 'block', 'annual')",
    )

    op.execute(
        "UPDATE meetings SET meeting_type = 'large' WHERE meeting_type = 'dormitory_general_assembly'"
    )
    op.execute(
        "UPDATE agendas SET meeting_type = 'large' WHERE meeting_type = 'dormitory_general_assembly'"
    )
