"""add meeting_type and agenda_relations table

Revision ID: 20260410_003
Revises: 20260410_002
Create Date: 2026-04-10 20:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260410_003"
down_revision: Union[str, None] = "20260410_002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "meetings",
        sa.Column("meeting_type", sa.String(), nullable=False, server_default="large"),
    )
    op.create_check_constraint(
        "ck_meetings_type",
        "meetings",
        "meeting_type IN ('large', 'block', 'annual')",
    )
    op.create_index(op.f("ix_meetings_meeting_type"), "meetings", ["meeting_type"], unique=False)

    op.create_table(
        "agenda_relations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source_agenda_id", sa.Integer(), nullable=False),
        sa.Column("target_agenda_id", sa.Integer(), nullable=False),
        sa.Column("relation_type", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            "relation_type IN ('past_block', 'other_reference')",
            name="ck_agenda_relations_type",
        ),
        sa.ForeignKeyConstraint(["source_agenda_id"], ["agendas.id"]),
        sa.ForeignKeyConstraint(["target_agenda_id"], ["agendas.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "source_agenda_id",
            "target_agenda_id",
            "relation_type",
            name="uq_agenda_relations_source_target_type",
        ),
    )
    op.create_index(
        op.f("ix_agenda_relations_source_agenda_id"),
        "agenda_relations",
        ["source_agenda_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agenda_relations_target_agenda_id"),
        "agenda_relations",
        ["target_agenda_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agenda_relations_relation_type"),
        "agenda_relations",
        ["relation_type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_agenda_relations_relation_type"), table_name="agenda_relations")
    op.drop_index(op.f("ix_agenda_relations_target_agenda_id"), table_name="agenda_relations")
    op.drop_index(op.f("ix_agenda_relations_source_agenda_id"), table_name="agenda_relations")
    op.drop_table("agenda_relations")

    op.drop_index(op.f("ix_meetings_meeting_type"), table_name="meetings")
    op.drop_constraint("ck_meetings_type", "meetings", type_="check")
    op.drop_column("meetings", "meeting_type")
