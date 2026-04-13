"""align agenda table with submission form and pdf metadata

Revision ID: 20260410_004
Revises: 20260410_003
Create Date: 2026-04-10 23:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260410_004"
down_revision: Union[str, None] = "20260410_003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("agendas", sa.Column("meeting_date", sa.Date(), nullable=True))
    op.add_column("agendas", sa.Column("meeting_type", sa.String(), nullable=True))
    op.add_column("agendas", sa.Column("responsible", sa.String(), nullable=True))
    op.add_column("agendas", sa.Column("agenda_types", sa.JSON(), nullable=True))
    op.add_column("agendas", sa.Column("voting_items", sa.Text(), nullable=True))
    op.add_column("agendas", sa.Column("pdf_s3_key", sa.String(), nullable=True))
    op.add_column("agendas", sa.Column("pdf_url", sa.String(), nullable=True))

    op.execute(
        """
        UPDATE agendas a
        INNER JOIN meetings m ON m.id = a.meeting_id
        SET a.meeting_date = DATE(m.scheduled_at),
            a.meeting_type = m.meeting_type
        """
    )
    op.execute("UPDATE agendas SET responsible = description WHERE responsible IS NULL")
    op.execute("UPDATE agendas SET agenda_types = JSON_ARRAY() WHERE agenda_types IS NULL")

    op.alter_column("agendas", "meeting_date", nullable=False)
    op.alter_column("agendas", "meeting_type", nullable=False)
    op.alter_column("agendas", "agenda_types", nullable=False)

    op.create_check_constraint(
        "ck_agendas_meeting_type",
        "agendas",
        "meeting_type IN ('large', 'block', 'annual')",
    )
    op.create_index(op.f("ix_agendas_meeting_date"), "agendas", ["meeting_date"], unique=False)
    op.create_index(op.f("ix_agendas_meeting_type"), "agendas", ["meeting_type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_agendas_meeting_type"), table_name="agendas")
    op.drop_index(op.f("ix_agendas_meeting_date"), table_name="agendas")
    op.drop_constraint("ck_agendas_meeting_type", "agendas", type_="check")

    op.drop_column("agendas", "pdf_url")
    op.drop_column("agendas", "pdf_s3_key")
    op.drop_column("agendas", "voting_items")
    op.drop_column("agendas", "agenda_types")
    op.drop_column("agendas", "responsible")
    op.drop_column("agendas", "meeting_type")
    op.drop_column("agendas", "meeting_date")
