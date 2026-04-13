"""expand domain schema with RBAC, meetings, content, and audit logs

Revision ID: 20260410_002
Revises: 20260409_001
Create Date: 2026-04-10 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260410_002"
down_revision: Union[str, None] = "20260409_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_roles_name"), "roles", ["name"], unique=True)

    op.create_table(
        "permissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("resource_type", sa.String(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_permissions_action"), "permissions", ["action"], unique=False)
    op.create_index(op.f("ix_permissions_name"), "permissions", ["name"], unique=True)
    op.create_index(
        op.f("ix_permissions_resource_type"), "permissions", ["resource_type"], unique=False
    )

    op.create_table(
        "user_roles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("assigned_at", sa.DateTime(), nullable=False),
        sa.Column("assigned_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["assigned_by"], ["user.id"]),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "role_id", name="uq_user_roles_user_role"),
    )
    op.create_index(op.f("ix_user_roles_role_id"), "user_roles", ["role_id"], unique=False)
    op.create_index(op.f("ix_user_roles_user_id"), "user_roles", ["user_id"], unique=False)

    op.create_table(
        "role_permissions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("permission_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"]),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("role_id", "permission_id", name="uq_role_permissions_role_permission"),
    )
    op.create_index(
        op.f("ix_role_permissions_permission_id"),
        "role_permissions",
        ["permission_id"],
        unique=False,
    )
    op.create_index(op.f("ix_role_permissions_role_id"), "role_permissions", ["role_id"], unique=False)

    op.create_table(
        "meetings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(), nullable=False),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("meeting_scale", sa.String(), nullable=False),
        sa.Column("minutes_scope_policy", sa.String(), nullable=False),
        sa.Column("participant_count_planned", sa.Integer(), nullable=True),
        sa.Column("participant_count_actual", sa.Integer(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("meeting_scale IN ('large', 'medium', 'small')", name="ck_meetings_scale"),
        sa.CheckConstraint(
            "minutes_scope_policy IN ('agenda', 'meeting')",
            name="ck_meetings_minutes_scope_policy",
        ),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_meetings_created_by"), "meetings", ["created_by"], unique=False)
    op.create_index(op.f("ix_meetings_meeting_scale"), "meetings", ["meeting_scale"], unique=False)
    op.create_index(
        op.f("ix_meetings_minutes_scope_policy"), "meetings", ["minutes_scope_policy"], unique=False
    )
    op.create_index(op.f("ix_meetings_scheduled_at"), "meetings", ["scheduled_at"], unique=False)
    op.create_index(op.f("ix_meetings_status"), "meetings", ["status"], unique=False)
    op.create_index(op.f("ix_meetings_title"), "meetings", ["title"], unique=False)

    op.create_table(
        "meeting_attendees",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("added_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint(
            "status IN ('invited', 'attending', 'absent', 'declined')",
            name="ck_meeting_attendees_status",
        ),
        sa.ForeignKeyConstraint(["meeting_id"], ["meetings.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("meeting_id", "user_id", name="uq_meeting_attendees_meeting_user"),
    )
    op.create_index(
        op.f("ix_meeting_attendees_meeting_id"), "meeting_attendees", ["meeting_id"], unique=False
    )
    op.create_index(op.f("ix_meeting_attendees_status"), "meeting_attendees", ["status"], unique=False)
    op.create_index(op.f("ix_meeting_attendees_user_id"), "meeting_attendees", ["user_id"], unique=False)

    op.create_table(
        "agendas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("order_no", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint(
            "status IN ('draft', 'published', 'archived')",
            name="ck_agendas_status",
        ),
        sa.CheckConstraint(
            "priority BETWEEN 1 AND 5",
            name="ck_agendas_priority",
        ),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"]),
        sa.ForeignKeyConstraint(["meeting_id"], ["meetings.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("meeting_id", "order_no", name="uq_agendas_meeting_order"),
    )
    op.create_index(op.f("ix_agendas_created_by"), "agendas", ["created_by"], unique=False)
    op.create_index(op.f("ix_agendas_meeting_id"), "agendas", ["meeting_id"], unique=False)
    op.create_index(op.f("ix_agendas_priority"), "agendas", ["priority"], unique=False)
    op.create_index(op.f("ix_agendas_status"), "agendas", ["status"], unique=False)
    op.create_index(op.f("ix_agendas_title"), "agendas", ["title"], unique=False)

    op.create_table(
        "minutes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("meeting_id", sa.Integer(), nullable=False),
        sa.Column("agenda_id", sa.Integer(), nullable=True),
        sa.Column("scope_type", sa.String(), nullable=False),
        sa.Column("scope_entity_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("approved_by", sa.Integer(), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint(
            "scope_type IN ('meeting', 'agenda')",
            name="ck_minutes_scope_type",
        ),
        sa.CheckConstraint(
            "status IN ('draft', 'review', 'approved', 'published')",
            name="ck_minutes_status",
        ),
        sa.CheckConstraint(
            "(scope_type = 'meeting' AND agenda_id IS NULL AND scope_entity_id = meeting_id) OR "
            "(scope_type = 'agenda' AND agenda_id IS NOT NULL AND scope_entity_id = agenda_id)",
            name="ck_minutes_scope_consistency",
        ),
        sa.ForeignKeyConstraint(["agenda_id"], ["agendas.id"]),
        sa.ForeignKeyConstraint(["approved_by"], ["user.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"]),
        sa.ForeignKeyConstraint(["meeting_id"], ["meetings.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("scope_type", "scope_entity_id", name="uq_minutes_scope_entity"),
    )
    op.create_index(op.f("ix_minutes_agenda_id"), "minutes", ["agenda_id"], unique=False)
    op.create_index(op.f("ix_minutes_created_by"), "minutes", ["created_by"], unique=False)
    op.create_index(op.f("ix_minutes_meeting_id"), "minutes", ["meeting_id"], unique=False)
    op.create_index(op.f("ix_minutes_scope_entity_id"), "minutes", ["scope_entity_id"], unique=False)
    op.create_index(op.f("ix_minutes_scope_type"), "minutes", ["scope_type"], unique=False)
    op.create_index(op.f("ix_minutes_status"), "minutes", ["status"], unique=False)

    op.create_table(
        "minute_revisions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("minutes_id", sa.Integer(), nullable=False),
        sa.Column("version_no", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("change_reason", sa.String(), nullable=True),
        sa.Column("changed_by", sa.Integer(), nullable=False),
        sa.Column("changed_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["changed_by"], ["user.id"]),
        sa.ForeignKeyConstraint(["minutes_id"], ["minutes.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("minutes_id", "version_no", name="uq_minute_revisions_minutes_version"),
    )
    op.create_index(
        op.f("ix_minute_revisions_changed_by"), "minute_revisions", ["changed_by"], unique=False
    )
    op.create_index(
        op.f("ix_minute_revisions_minutes_id"), "minute_revisions", ["minutes_id"], unique=False
    )

    op.create_table(
        "notices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint(
            "status IN ('draft', 'published', 'archived')",
            name="ck_notices_status",
        ),
        sa.CheckConstraint(
            "category IN ('important', 'info', 'warning')",
            name="ck_notices_category",
        ),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notices_category"), "notices", ["category"], unique=False)
    op.create_index(op.f("ix_notices_created_by"), "notices", ["created_by"], unique=False)
    op.create_index(op.f("ix_notices_status"), "notices", ["status"], unique=False)
    op.create_index(op.f("ix_notices_title"), "notices", ["title"], unique=False)

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("actor_role_snapshot", sa.String(), nullable=True),
        sa.Column("entity_type", sa.String(), nullable=False),
        sa.Column("entity_id", sa.String(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("before_json", sa.JSON(), nullable=True),
        sa.Column("after_json", sa.JSON(), nullable=True),
        sa.Column("changed_fields", sa.JSON(), nullable=True),
        sa.Column("result", sa.String(), nullable=False),
        sa.Column("error_code", sa.String(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("request_id", sa.String(), nullable=True),
        sa.Column("trace_id", sa.String(), nullable=True),
        sa.Column("session_id", sa.String(), nullable=True),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_logs_action"), "audit_logs", ["action"], unique=False)
    op.create_index(op.f("ix_audit_logs_actor_user_id"), "audit_logs", ["actor_user_id"], unique=False)
    op.create_index(op.f("ix_audit_logs_entity_id"), "audit_logs", ["entity_id"], unique=False)
    op.create_index(op.f("ix_audit_logs_entity_type"), "audit_logs", ["entity_type"], unique=False)
    op.create_index(op.f("ix_audit_logs_occurred_at"), "audit_logs", ["occurred_at"], unique=False)
    op.create_index(op.f("ix_audit_logs_request_id"), "audit_logs", ["request_id"], unique=False)
    op.create_index(op.f("ix_audit_logs_result"), "audit_logs", ["result"], unique=False)
    op.create_index(op.f("ix_audit_logs_session_id"), "audit_logs", ["session_id"], unique=False)
    op.create_index(op.f("ix_audit_logs_trace_id"), "audit_logs", ["trace_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_audit_logs_trace_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_session_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_result"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_request_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_occurred_at"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_entity_type"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_entity_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_actor_user_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_action"), table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index(op.f("ix_notices_title"), table_name="notices")
    op.drop_index(op.f("ix_notices_status"), table_name="notices")
    op.drop_index(op.f("ix_notices_created_by"), table_name="notices")
    op.drop_index(op.f("ix_notices_category"), table_name="notices")
    op.drop_table("notices")

    op.drop_index(op.f("ix_minute_revisions_minutes_id"), table_name="minute_revisions")
    op.drop_index(op.f("ix_minute_revisions_changed_by"), table_name="minute_revisions")
    op.drop_table("minute_revisions")

    op.drop_index(op.f("ix_minutes_status"), table_name="minutes")
    op.drop_index(op.f("ix_minutes_scope_type"), table_name="minutes")
    op.drop_index(op.f("ix_minutes_scope_entity_id"), table_name="minutes")
    op.drop_index(op.f("ix_minutes_meeting_id"), table_name="minutes")
    op.drop_index(op.f("ix_minutes_created_by"), table_name="minutes")
    op.drop_index(op.f("ix_minutes_agenda_id"), table_name="minutes")
    op.drop_table("minutes")

    op.drop_index(op.f("ix_agendas_title"), table_name="agendas")
    op.drop_index(op.f("ix_agendas_status"), table_name="agendas")
    op.drop_index(op.f("ix_agendas_priority"), table_name="agendas")
    op.drop_index(op.f("ix_agendas_meeting_id"), table_name="agendas")
    op.drop_index(op.f("ix_agendas_created_by"), table_name="agendas")
    op.drop_table("agendas")

    op.drop_index(op.f("ix_meeting_attendees_user_id"), table_name="meeting_attendees")
    op.drop_index(op.f("ix_meeting_attendees_status"), table_name="meeting_attendees")
    op.drop_index(op.f("ix_meeting_attendees_meeting_id"), table_name="meeting_attendees")
    op.drop_table("meeting_attendees")

    op.drop_index(op.f("ix_meetings_title"), table_name="meetings")
    op.drop_index(op.f("ix_meetings_status"), table_name="meetings")
    op.drop_index(op.f("ix_meetings_scheduled_at"), table_name="meetings")
    op.drop_index(op.f("ix_meetings_minutes_scope_policy"), table_name="meetings")
    op.drop_index(op.f("ix_meetings_meeting_scale"), table_name="meetings")
    op.drop_index(op.f("ix_meetings_created_by"), table_name="meetings")
    op.drop_table("meetings")

    op.drop_index(op.f("ix_role_permissions_role_id"), table_name="role_permissions")
    op.drop_index(op.f("ix_role_permissions_permission_id"), table_name="role_permissions")
    op.drop_table("role_permissions")

    op.drop_index(op.f("ix_user_roles_user_id"), table_name="user_roles")
    op.drop_index(op.f("ix_user_roles_role_id"), table_name="user_roles")
    op.drop_table("user_roles")

    op.drop_index(op.f("ix_permissions_resource_type"), table_name="permissions")
    op.drop_index(op.f("ix_permissions_name"), table_name="permissions")
    op.drop_index(op.f("ix_permissions_action"), table_name="permissions")
    op.drop_table("permissions")

    op.drop_index(op.f("ix_roles_name"), table_name="roles")
    op.drop_table("roles")

    # no user table changes in this revision
