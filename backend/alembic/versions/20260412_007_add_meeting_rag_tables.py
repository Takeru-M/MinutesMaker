"""add meeting rag metadata tables

Revision ID: 20260412_007
Revises: 20260412_006
Create Date: 2026-04-12 15:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260412_007"
down_revision: Union[str, None] = "20260412_006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "meeting_knowledge_sources",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("source_type", sa.String(), nullable=False),
        sa.Column("source_entity_id", sa.Integer(), nullable=False),
        sa.Column("source_label", sa.String(), nullable=True),
        sa.Column("source_uri", sa.String(), nullable=True),
        sa.Column("version_tag", sa.String(), nullable=False),
        sa.Column("content_hash", sa.String(), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            "source_type IN ('meeting', 'agenda', 'minutes', 'content', 'content_attachment')",
            name="ck_meeting_knowledge_sources_source_type",
        ),
        sa.ForeignKeyConstraint(["meeting_id"], ["meetings.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "meeting_id",
            "source_type",
            "source_entity_id",
            "version_tag",
            name="uq_meeting_knowledge_sources_entity_version",
        ),
    )
    op.create_index(
        op.f("ix_meeting_knowledge_sources_meeting_id"),
        "meeting_knowledge_sources",
        ["meeting_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_meeting_knowledge_sources_source_type"),
        "meeting_knowledge_sources",
        ["source_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_meeting_knowledge_sources_source_entity_id"),
        "meeting_knowledge_sources",
        ["source_entity_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_meeting_knowledge_sources_version_tag"),
        "meeting_knowledge_sources",
        ["version_tag"],
        unique=False,
    )
    op.create_index(
        op.f("ix_meeting_knowledge_sources_content_hash"),
        "meeting_knowledge_sources",
        ["content_hash"],
        unique=False,
    )

    op.create_table(
        "meeting_knowledge_chunks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("source_id", sa.Integer(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False),
        sa.Column("embedding_model", sa.String(), nullable=False),
        sa.Column("embedding_vector_id", sa.String(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["meeting_id"], ["meetings.id"]),
        sa.ForeignKeyConstraint(["source_id"], ["meeting_knowledge_sources.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("embedding_vector_id"),
        sa.UniqueConstraint(
            "source_id",
            "chunk_index",
            name="uq_meeting_knowledge_chunks_source_chunk_index",
        ),
    )
    op.create_index(
        op.f("ix_meeting_knowledge_chunks_meeting_id"),
        "meeting_knowledge_chunks",
        ["meeting_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_meeting_knowledge_chunks_source_id"),
        "meeting_knowledge_chunks",
        ["source_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_meeting_knowledge_chunks_embedding_vector_id"),
        "meeting_knowledge_chunks",
        ["embedding_vector_id"],
        unique=True,
    )

    op.create_table(
        "meeting_qa_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("retrieved_chunk_ids", sa.JSON(), nullable=False),
        sa.Column("model_name", sa.String(), nullable=True),
        sa.Column("prompt_tokens", sa.Integer(), nullable=True),
        sa.Column("completion_tokens", sa.Integer(), nullable=True),
        sa.Column("total_tokens", sa.Integer(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["meeting_id"], ["meetings.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_meeting_qa_logs_meeting_id"), "meeting_qa_logs", ["meeting_id"], unique=False)
    op.create_index(op.f("ix_meeting_qa_logs_user_id"), "meeting_qa_logs", ["user_id"], unique=False)
    op.create_index(op.f("ix_meeting_qa_logs_model_name"), "meeting_qa_logs", ["model_name"], unique=False)
    op.create_index(op.f("ix_meeting_qa_logs_created_at"), "meeting_qa_logs", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_meeting_qa_logs_created_at"), table_name="meeting_qa_logs")
    op.drop_index(op.f("ix_meeting_qa_logs_model_name"), table_name="meeting_qa_logs")
    op.drop_index(op.f("ix_meeting_qa_logs_user_id"), table_name="meeting_qa_logs")
    op.drop_index(op.f("ix_meeting_qa_logs_meeting_id"), table_name="meeting_qa_logs")
    op.drop_table("meeting_qa_logs")

    op.drop_index(op.f("ix_meeting_knowledge_chunks_embedding_vector_id"), table_name="meeting_knowledge_chunks")
    op.drop_index(op.f("ix_meeting_knowledge_chunks_source_id"), table_name="meeting_knowledge_chunks")
    op.drop_index(op.f("ix_meeting_knowledge_chunks_meeting_id"), table_name="meeting_knowledge_chunks")
    op.drop_table("meeting_knowledge_chunks")

    op.drop_index(op.f("ix_meeting_knowledge_sources_content_hash"), table_name="meeting_knowledge_sources")
    op.drop_index(op.f("ix_meeting_knowledge_sources_version_tag"), table_name="meeting_knowledge_sources")
    op.drop_index(op.f("ix_meeting_knowledge_sources_source_entity_id"), table_name="meeting_knowledge_sources")
    op.drop_index(op.f("ix_meeting_knowledge_sources_source_type"), table_name="meeting_knowledge_sources")
    op.drop_index(op.f("ix_meeting_knowledge_sources_meeting_id"), table_name="meeting_knowledge_sources")
    op.drop_table("meeting_knowledge_sources")
