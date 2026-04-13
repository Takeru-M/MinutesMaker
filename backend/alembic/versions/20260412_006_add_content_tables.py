"""add content and content_attachments tables

Revision ID: 20260412_006
Revises: 20260411_005
Create Date: 2026-04-12 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260412_006"
down_revision: Union[str, None] = "20260411_005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "contents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("content_type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint("content_type IN ('repository', 'guide')", name="ck_contents_content_type"),
        sa.CheckConstraint("status IN ('draft', 'published', 'archived')", name="ck_contents_status"),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_contents_content_type"), "contents", ["content_type"], unique=False)
    op.create_index(op.f("ix_contents_title"), "contents", ["title"], unique=False)
    op.create_index(op.f("ix_contents_status"), "contents", ["status"], unique=False)
    op.create_index(op.f("ix_contents_created_by"), "contents", ["created_by"], unique=False)

    op.create_table(
        "content_attachments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("content_id", sa.Integer(), nullable=False),
        sa.Column("file_name", sa.String(), nullable=False),
        sa.Column("s3_key", sa.String(), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("mime_type", sa.String(), nullable=False),
        sa.Column("order_no", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["content_id"], ["contents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_content_attachments_content_id"), "content_attachments", ["content_id"], unique=False)
    op.create_index(op.f("ix_content_attachments_s3_key"), "content_attachments", ["s3_key"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_content_attachments_s3_key"), table_name="content_attachments")
    op.drop_index(op.f("ix_content_attachments_content_id"), table_name="content_attachments")
    op.drop_table("content_attachments")
    op.drop_index(op.f("ix_contents_created_by"), table_name="contents")
    op.drop_index(op.f("ix_contents_status"), table_name="contents")
    op.drop_index(op.f("ix_contents_title"), table_name="contents")
    op.drop_index(op.f("ix_contents_content_type"), table_name="contents")
    op.drop_table("contents")
