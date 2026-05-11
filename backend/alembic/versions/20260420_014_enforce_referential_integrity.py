"""enforce referential integrity with cascading delete policies and denormalization removal

Revision ID: 20260420_014
Revises: 20260415_013
Create Date: 2026-04-20 00:00:00

This migration enforces referential integrity across all tables by:
1. Adding explicit ondelete policies to all foreign keys (CASCADE, RESTRICT, SET NULL)
2. Removing denormalized fields from agendas (meeting_type, meeting_date)
3. Removing composite FK from agendas (meeting_id, meeting_type)
4. Strengthening data consistency constraints

Changes make the database schema more robust and prevent data anomalies.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260420_014"
down_revision: Union[str, None] = "20260415_013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Drop existing composite FK from agendas table
    op.drop_constraint("fk_agendas_meeting_id_meeting_type", "agendas", type_="foreignkey")

    # Step 2: Drop denormalized columns from agendas
    op.drop_index("ix_agendas_meeting_date", table_name="agendas")
    op.drop_index("ix_agendas_meeting_type", table_name="agendas")
    op.drop_constraint("ck_agendas_meeting_type", "agendas", type_="check")
    op.drop_column("agendas", "meeting_date")
    op.drop_column("agendas", "meeting_type")

    # Step 3: Update MINUTES table foreign keys with policies
    # Drop old constraints
    op.drop_constraint("fk_minutes_agenda_id", "minutes", type_="foreignkey")
    op.drop_constraint("fk_minutes_meeting_id", "minutes", type_="foreignkey")

    # Re-add with policies
    op.create_foreign_key(
        "fk_minutes_meeting_id",
        "minutes",
        "meetings",
        ["meeting_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_minutes_agenda_id",
        "minutes",
        "agendas",
        ["agenda_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Update created_by and approved_by
    op.drop_constraint("fk_minutes_created_by", "minutes", type_="foreignkey", )
    op.create_foreign_key(
        "fk_minutes_created_by",
        "minutes",
        "user",
        ["created_by"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.drop_constraint("fk_minutes_approved_by", "minutes", type_="foreignkey", )
    op.create_foreign_key(
        "fk_minutes_approved_by",
        "minutes",
        "user",
        ["approved_by"],
        ["id"],
        ondelete="SET NULL",
    )

    # Step 4: Update MINUTE_REVISIONS table foreign keys
    op.drop_constraint("fk_minute_revisions_minutes_id", "minute_revisions", type_="foreignkey")
    op.create_foreign_key(
        "fk_minute_revisions_minutes_id",
        "minute_revisions",
        "minutes",
        ["minutes_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("fk_minute_revisions_changed_by", "minute_revisions", type_="foreignkey")
    op.create_foreign_key(
        "fk_minute_revisions_changed_by",
        "minute_revisions",
        "user",
        ["changed_by"],
        ["id"],
        ondelete="RESTRICT",
    )

    # Step 5: Update ORGANIZATION_MEMBERSHIPS table foreign keys
    op.drop_constraint("fk_org_memberships_user_id", "organization_memberships", type_="foreignkey")
    op.create_foreign_key(
        "fk_org_memberships_user_id",
        "organization_memberships",
        "user",
        ["user_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.drop_constraint("fk_org_memberships_organization_id", "organization_memberships", type_="foreignkey")
    op.create_foreign_key(
        "fk_org_memberships_organization_id",
        "organization_memberships",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("fk_org_memberships_role_id", "organization_memberships", type_="foreignkey")
    op.create_foreign_key(
        "fk_org_memberships_role_id",
        "organization_memberships",
        "roles",
        ["role_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.drop_constraint("fk_org_memberships_assigned_by", "organization_memberships", type_="foreignkey")
    op.create_foreign_key(
        "fk_org_memberships_assigned_by",
        "organization_memberships",
        "user",
        ["assigned_by"],
        ["id"],
        ondelete="SET NULL",
    )

    # Step 6: Update AGENDAS table foreign keys (main FK already RESTRICT since meeting_id simple FK)
    op.drop_constraint("fk_agendas_meeting", "agendas", type_="foreignkey")
    op.create_foreign_key(
        "fk_agendas_meeting",
        "agendas",
        "meetings",
        ["meeting_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.drop_constraint("fk_agendas_created_by", "agendas", type_="foreignkey")
    op.create_foreign_key(
        "fk_agendas_created_by",
        "agendas",
        "user",
        ["created_by"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.drop_constraint("fk_agendas_updated_by", "agendas", type_="foreignkey")
    op.create_foreign_key(
        "fk_agendas_updated_by",
        "agendas",
        "user",
        ["updated_by"],
        ["id"],
        ondelete="SET NULL",
    )

    # Step 7: Update AGENDA_ATTACHMENTS foreign key
    op.drop_constraint("fk_agenda_attachments_agenda", "agenda_attachments", type_="foreignkey")
    op.create_foreign_key(
        "fk_agenda_attachments_agenda",
        "agenda_attachments",
        "agendas",
        ["agenda_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Step 8: Update AGENDA_RELATIONS foreign keys
    op.drop_constraint("fk_agenda_relations_source", "agenda_relations", type_="foreignkey")
    op.create_foreign_key(
        "fk_agenda_relations_source",
        "agenda_relations",
        "agendas",
        ["source_agenda_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("fk_agenda_relations_target", "agenda_relations", type_="foreignkey")
    op.create_foreign_key(
        "fk_agenda_relations_target",
        "agenda_relations",
        "agendas",
        ["target_agenda_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Step 9: Update CONTENTS table foreign keys
    op.drop_constraint("fk_contents_created_by", "contents", type_="foreignkey")
    op.create_foreign_key(
        "fk_contents_created_by",
        "contents",
        "user",
        ["created_by"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.drop_constraint("fk_contents_updated_by", "contents", type_="foreignkey")
    op.create_foreign_key(
        "fk_contents_updated_by",
        "contents",
        "user",
        ["updated_by"],
        ["id"],
        ondelete="SET NULL",
    )

    # Step 10: Update CONTENT_ATTACHMENTS foreign key
    op.drop_constraint("fk_content_attachments_content", "content_attachments", type_="foreignkey")
    op.create_foreign_key(
        "fk_content_attachments_content",
        "content_attachments",
        "contents",
        ["content_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Step 11: Update NOTICES table foreign keys
    op.drop_constraint("fk_notices_created_by", "notices", type_="foreignkey")
    op.create_foreign_key(
        "fk_notices_created_by",
        "notices",
        "user",
        ["created_by"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.drop_constraint("fk_notices_updated_by", "notices", type_="foreignkey")
    op.create_foreign_key(
        "fk_notices_updated_by",
        "notices",
        "user",
        ["updated_by"],
        ["id"],
        ondelete="SET NULL",
    )

    # Step 12: Update NOTICE_ATTACHMENTS foreign key
    op.drop_constraint("fk_notice_attachments_notice", "notice_attachments", type_="foreignkey")
    op.create_foreign_key(
        "fk_notice_attachments_notice",
        "notice_attachments",
        "notices",
        ["notice_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Step 13: Update MEETINGS table created_by foreign key
    op.drop_constraint("fk_meetings_created_by", "meetings", type_="foreignkey")
    op.create_foreign_key(
        "fk_meetings_created_by",
        "meetings",
        "user",
        ["created_by"],
        ["id"],
        ondelete="RESTRICT",
    )

    # Step 14: Update MEETING_ATTENDEES table foreign keys
    op.drop_constraint("fk_meeting_attendees_meeting", "meeting_attendees", type_="foreignkey")
    op.create_foreign_key(
        "fk_meeting_attendees_meeting",
        "meeting_attendees",
        "meetings",
        ["meeting_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("fk_meeting_attendees_user", "meeting_attendees", type_="foreignkey")
    op.create_foreign_key(
        "fk_meeting_attendees_user",
        "meeting_attendees",
        "user",
        ["user_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    # Step 15: Update USER_ROLES table foreign keys
    op.drop_constraint("fk_user_roles_user", "user_roles", type_="foreignkey")
    op.create_foreign_key(
        "fk_user_roles_user",
        "user_roles",
        "user",
        ["user_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.drop_constraint("fk_user_roles_role", "user_roles", type_="foreignkey")
    op.create_foreign_key(
        "fk_user_roles_role",
        "user_roles",
        "roles",
        ["role_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.drop_constraint("fk_user_roles_assigned_by", "user_roles", type_="foreignkey")
    op.create_foreign_key(
        "fk_user_roles_assigned_by",
        "user_roles",
        "user",
        ["assigned_by"],
        ["id"],
        ondelete="SET NULL",
    )

    # Step 16: Update MEETING_KNOWLEDGE_SOURCES table
    op.drop_constraint("fk_meeting_knowledge_sources_meeting", "meeting_knowledge_sources", type_="foreignkey")
    op.create_foreign_key(
        "fk_meeting_knowledge_sources_meeting",
        "meeting_knowledge_sources",
        "meetings",
        ["meeting_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Step 17: Update MEETING_KNOWLEDGE_CHUNKS table
    op.drop_constraint("fk_meeting_knowledge_chunks_meeting", "meeting_knowledge_chunks", type_="foreignkey")
    op.create_foreign_key(
        "fk_meeting_knowledge_chunks_meeting",
        "meeting_knowledge_chunks",
        "meetings",
        ["meeting_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("fk_meeting_knowledge_chunks_source", "meeting_knowledge_chunks", type_="foreignkey")
    op.create_foreign_key(
        "fk_meeting_knowledge_chunks_source",
        "meeting_knowledge_chunks",
        "meeting_knowledge_sources",
        ["source_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Step 18: Update MEETING_QA_LOGS table (if exists)
    try:
        op.drop_constraint("fk_meeting_qa_logs_meeting", "meeting_qa_logs", type_="foreignkey")
        op.create_foreign_key(
            "fk_meeting_qa_logs_meeting",
            "meeting_qa_logs",
            "meetings",
            ["meeting_id"],
            ["id"],
            ondelete="CASCADE",
        )

        op.drop_constraint("fk_meeting_qa_logs_user", "meeting_qa_logs", type_="foreignkey")
        op.create_foreign_key(
            "fk_meeting_qa_logs_user",
            "meeting_qa_logs",
            "user",
            ["user_id"],
            ["id"],
            ondelete="RESTRICT",
        )
    except Exception:
        # meeting_qa_logs table might not exist in all deployments
        pass

    # Step 19: Update AUDIT_LOGS table
    op.drop_constraint("fk_audit_logs_actor_user", "audit_logs", type_="foreignkey")
    op.create_foreign_key(
        "fk_audit_logs_actor_user",
        "audit_logs",
        "user",
        ["actor_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    # Revert all foreign key constraints to original state (without ondelete policies)
    # Note: This is a best-effort downgrade. In production, manual review is recommended.

    # Revert AUDIT_LOGS
    op.drop_constraint("fk_audit_logs_actor_user", "audit_logs", type_="foreignkey")
    op.create_foreign_key("fk_audit_logs_actor_user", "audit_logs", "user", ["actor_user_id"], ["id"])

    # Revert MEETING_QA_LOGS (if exists)
    try:
        op.drop_constraint("fk_meeting_qa_logs_user", "meeting_qa_logs", type_="foreignkey")
        op.create_foreign_key("fk_meeting_qa_logs_user", "meeting_qa_logs", "user", ["user_id"], ["id"])

        op.drop_constraint("fk_meeting_qa_logs_meeting", "meeting_qa_logs", type_="foreignkey")
        op.create_foreign_key(
            "fk_meeting_qa_logs_meeting", "meeting_qa_logs", "meetings", ["meeting_id"], ["id"]
        )
    except Exception:
        pass

    # Revert MEETING_KNOWLEDGE_CHUNKS
    op.drop_constraint("fk_meeting_knowledge_chunks_source", "meeting_knowledge_chunks", type_="foreignkey")
    op.create_foreign_key(
        "fk_meeting_knowledge_chunks_source",
        "meeting_knowledge_chunks",
        "meeting_knowledge_sources",
        ["source_id"],
        ["id"],
    )

    op.drop_constraint("fk_meeting_knowledge_chunks_meeting", "meeting_knowledge_chunks", type_="foreignkey")
    op.create_foreign_key(
        "fk_meeting_knowledge_chunks_meeting", "meeting_knowledge_chunks", "meetings", ["meeting_id"], ["id"]
    )

    # Revert MEETING_KNOWLEDGE_SOURCES
    op.drop_constraint("fk_meeting_knowledge_sources_meeting", "meeting_knowledge_sources", type_="foreignkey")
    op.create_foreign_key(
        "fk_meeting_knowledge_sources_meeting",
        "meeting_knowledge_sources",
        "meetings",
        ["meeting_id"],
        ["id"],
    )

    # Revert USER_ROLES
    op.drop_constraint("fk_user_roles_assigned_by", "user_roles", type_="foreignkey")
    op.create_foreign_key("fk_user_roles_assigned_by", "user_roles", "user", ["assigned_by"], ["id"])

    op.drop_constraint("fk_user_roles_role", "user_roles", type_="foreignkey")
    op.create_foreign_key("fk_user_roles_role", "user_roles", "roles", ["role_id"], ["id"])

    op.drop_constraint("fk_user_roles_user", "user_roles", type_="foreignkey")
    op.create_foreign_key("fk_user_roles_user", "user_roles", "user", ["user_id"], ["id"])

    # Revert MEETING_ATTENDEES
    op.drop_constraint("fk_meeting_attendees_user", "meeting_attendees", type_="foreignkey")
    op.create_foreign_key("fk_meeting_attendees_user", "meeting_attendees", "user", ["user_id"], ["id"])

    op.drop_constraint("fk_meeting_attendees_meeting", "meeting_attendees", type_="foreignkey")
    op.create_foreign_key(
        "fk_meeting_attendees_meeting", "meeting_attendees", "meetings", ["meeting_id"], ["id"]
    )

    # Revert MEETINGS
    op.drop_constraint("fk_meetings_created_by", "meetings", type_="foreignkey")
    op.create_foreign_key("fk_meetings_created_by", "meetings", "user", ["created_by"], ["id"])

    # Revert NOTICE_ATTACHMENTS
    op.drop_constraint("fk_notice_attachments_notice", "notice_attachments", type_="foreignkey")
    op.create_foreign_key(
        "fk_notice_attachments_notice", "notice_attachments", "notices", ["notice_id"], ["id"]
    )

    # Revert NOTICES
    op.drop_constraint("fk_notices_updated_by", "notices", type_="foreignkey")
    op.create_foreign_key("fk_notices_updated_by", "notices", "user", ["updated_by"], ["id"])

    op.drop_constraint("fk_notices_created_by", "notices", type_="foreignkey")
    op.create_foreign_key("fk_notices_created_by", "notices", "user", ["created_by"], ["id"])

    # Revert CONTENT_ATTACHMENTS
    op.drop_constraint("fk_content_attachments_content", "content_attachments", type_="foreignkey")
    op.create_foreign_key(
        "fk_content_attachments_content", "content_attachments", "contents", ["content_id"], ["id"]
    )

    # Revert CONTENTS
    op.drop_constraint("fk_contents_updated_by", "contents", type_="foreignkey")
    op.create_foreign_key("fk_contents_updated_by", "contents", "user", ["updated_by"], ["id"])

    op.drop_constraint("fk_contents_created_by", "contents", type_="foreignkey")
    op.create_foreign_key("fk_contents_created_by", "contents", "user", ["created_by"], ["id"])

    # Revert AGENDA_RELATIONS
    op.drop_constraint("fk_agenda_relations_target", "agenda_relations", type_="foreignkey")
    op.create_foreign_key(
        "fk_agenda_relations_target", "agenda_relations", "agendas", ["target_agenda_id"], ["id"]
    )

    op.drop_constraint("fk_agenda_relations_source", "agenda_relations", type_="foreignkey")
    op.create_foreign_key(
        "fk_agenda_relations_source", "agenda_relations", "agendas", ["source_agenda_id"], ["id"]
    )

    # Revert AGENDA_ATTACHMENTS
    op.drop_constraint("fk_agenda_attachments_agenda", "agenda_attachments", type_="foreignkey")
    op.create_foreign_key(
        "fk_agenda_attachments_agenda", "agenda_attachments", "agendas", ["agenda_id"], ["id"]
    )

    # Revert AGENDAS
    op.drop_constraint("fk_agendas_updated_by", "agendas", type_="foreignkey")
    op.create_foreign_key("fk_agendas_updated_by", "agendas", "user", ["updated_by"], ["id"])

    op.drop_constraint("fk_agendas_created_by", "agendas", type_="foreignkey")
    op.create_foreign_key("fk_agendas_created_by", "agendas", "user", ["created_by"], ["id"])

    op.drop_constraint("fk_agendas_meeting", "agendas", type_="foreignkey")
    op.create_foreign_key("fk_agendas_meeting", "agendas", "meetings", ["meeting_id"], ["id"])

    # Add back denormalized columns to agendas
    op.add_column("agendas", sa.Column("meeting_type", sa.String(255), nullable=False, server_default="large"))
    op.add_column("agendas", sa.Column("meeting_date", sa.Date(), nullable=False, server_default=sa.func.curdate()))

    op.create_check_constraint(
        "ck_agendas_meeting_type",
        "agendas",
        "meeting_type IN ('dormitory_general_assembly', 'block', 'annual')",
    )
    op.create_index(op.f("ix_agendas_meeting_type"), "agendas", ["meeting_type"], unique=False)
    op.create_index(op.f("ix_agendas_meeting_date"), "agendas", ["meeting_date"], unique=False)

    # Restore composite FK
    op.create_foreign_key(
        "fk_agendas_meeting_id_meeting_type",
        "agendas",
        "meetings",
        ["meeting_id", "meeting_type"],
        ["id", "meeting_type"],
    )

    # Revert ORGANIZATION_MEMBERSHIPS
    op.drop_constraint("fk_org_memberships_assigned_by", "organization_memberships", type_="foreignkey")
    op.create_foreign_key(
        "fk_org_memberships_assigned_by", "organization_memberships", "user", ["assigned_by"], ["id"]
    )

    op.drop_constraint("fk_org_memberships_role_id", "organization_memberships", type_="foreignkey")
    op.create_foreign_key(
        "fk_org_memberships_role_id", "organization_memberships", "roles", ["role_id"], ["id"]
    )

    op.drop_constraint("fk_org_memberships_organization_id", "organization_memberships", type_="foreignkey")
    op.create_foreign_key(
        "fk_org_memberships_organization_id",
        "organization_memberships",
        "organizations",
        ["organization_id"],
        ["id"],
    )

    op.drop_constraint("fk_org_memberships_user_id", "organization_memberships", type_="foreignkey")
    op.create_foreign_key("fk_org_memberships_user_id", "organization_memberships", "user", ["user_id"], ["id"])

    # Revert MINUTE_REVISIONS
    op.drop_constraint("fk_minute_revisions_changed_by", "minute_revisions", type_="foreignkey")
    op.create_foreign_key("fk_minute_revisions_changed_by", "minute_revisions", "user", ["changed_by"], ["id"])

    op.drop_constraint("fk_minute_revisions_minutes_id", "minute_revisions", type_="foreignkey")
    op.create_foreign_key(
        "fk_minute_revisions_minutes_id", "minute_revisions", "minutes", ["minutes_id"], ["id"]
    )

    # Revert MINUTES
    op.drop_constraint("fk_minutes_approved_by", "minutes", type_="foreignkey")
    op.create_foreign_key("fk_minutes_approved_by", "minutes", "user", ["approved_by"], ["id"])

    op.drop_constraint("fk_minutes_created_by", "minutes", type_="foreignkey")
    op.create_foreign_key("fk_minutes_created_by", "minutes", "user", ["created_by"], ["id"])

    op.drop_constraint("fk_minutes_agenda_id", "minutes", type_="foreignkey")
    op.create_foreign_key("fk_minutes_agenda_id", "minutes", "agendas", ["agenda_id"], ["id"])

    op.drop_constraint("fk_minutes_meeting_id", "minutes", type_="foreignkey")
    op.create_foreign_key("fk_minutes_meeting_id", "minutes", "meetings", ["meeting_id"], ["id"])
