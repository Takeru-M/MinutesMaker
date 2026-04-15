"""add notice_attachments table

Revision ID: 20260415_012
Revises: 20260415_011
Create Date: 2026-04-15 20:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260415_012"
down_revision: Union[str, None] = "20260415_011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notice_attachments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("notice_id", sa.Integer(), nullable=False),
        sa.Column("file_name", sa.String(), nullable=False),
        sa.Column("s3_key", sa.String(), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("mime_type", sa.String(), nullable=False),
        sa.Column("order_no", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["notice_id"], ["notices.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notice_attachments_notice_id"), "notice_attachments", ["notice_id"], unique=False)
    op.create_index(op.f("ix_notice_attachments_s3_key"), "notice_attachments", ["s3_key"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_notice_attachments_s3_key"), table_name="notice_attachments")
    op.drop_index(op.f("ix_notice_attachments_notice_id"), table_name="notice_attachments")
    op.drop_table("notice_attachments")
