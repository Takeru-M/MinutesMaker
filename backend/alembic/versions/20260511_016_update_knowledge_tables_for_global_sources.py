"""Update knowledge tables for global sources

Revision ID: 20260511_016
Revises: 20260511_015
Create Date: 2026-05-11 00:00:00.000000

Changes:
- meeting_knowledge_sources.meeting_id: NOT NULL → NULL (global sources have no meeting)
- meeting_knowledge_sources: add org_id column
- meeting_knowledge_chunks.meeting_id: NOT NULL → NULL
- meeting_qa_logs.meeting_id: NOT NULL → NULL (assistant endpoint has no meeting context)
"""

from alembic import op
import sqlalchemy as sa

revision = "20260511_016"
down_revision = "20260511_015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # meeting_knowledge_sources: make meeting_id nullable and add org_id
    op.alter_column(
        "meeting_knowledge_sources",
        "meeting_id",
        existing_type=sa.Integer(),
        nullable=True,
    )
    op.add_column(
        "meeting_knowledge_sources",
        sa.Column("org_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_meeting_knowledge_sources_org_id",
        "meeting_knowledge_sources",
        ["org_id"],
    )
    op.create_foreign_key(
        "fk_meeting_knowledge_sources_org_id",
        "meeting_knowledge_sources",
        "organizations",
        ["org_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # meeting_knowledge_chunks: make meeting_id nullable
    op.alter_column(
        "meeting_knowledge_chunks",
        "meeting_id",
        existing_type=sa.Integer(),
        nullable=True,
    )

    # meeting_qa_logs: make meeting_id nullable
    op.alter_column(
        "meeting_qa_logs",
        "meeting_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "meeting_qa_logs",
        "meeting_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.alter_column(
        "meeting_knowledge_chunks",
        "meeting_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.drop_constraint(
        "fk_meeting_knowledge_sources_org_id",
        "meeting_knowledge_sources",
        type_="foreignkey",
    )
    op.drop_index(
        "ix_meeting_knowledge_sources_org_id",
        table_name="meeting_knowledge_sources",
    )
    op.drop_column("meeting_knowledge_sources", "org_id")
    op.alter_column(
        "meeting_knowledge_sources",
        "meeting_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
