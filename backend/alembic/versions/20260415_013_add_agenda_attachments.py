"""add agenda_attachments table

Revision ID: 20260415_013
Revises: 20260415_012
Create Date: 2026-04-15 23:40:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260415_013"
down_revision: Union[str, None] = "20260415_012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agenda_attachments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("agenda_id", sa.Integer(), nullable=False),
        sa.Column("file_name", sa.String(), nullable=False),
        sa.Column("s3_key", sa.String(), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("mime_type", sa.String(), nullable=False),
        sa.Column("order_no", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["agenda_id"], ["agendas.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_agenda_attachments_agenda_id"), "agenda_attachments", ["agenda_id"], unique=False)
    op.create_index(op.f("ix_agenda_attachments_s3_key"), "agenda_attachments", ["s3_key"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_agenda_attachments_s3_key"), table_name="agenda_attachments")
    op.drop_index(op.f("ix_agenda_attachments_agenda_id"), table_name="agenda_attachments")
    op.drop_table("agenda_attachments")
