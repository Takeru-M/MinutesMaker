"""add organizations and organization memberships

Revision ID: 20260415_011
Revises: 20260414_010
Create Date: 2026-04-15 09:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260415_011"
down_revision = "20260414_010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("name", name="uq_organizations_name"),
        sa.UniqueConstraint("slug", name="uq_organizations_slug"),
    )
    op.create_index(op.f("ix_organizations_name"), "organizations", ["name"], unique=False)
    op.create_index(op.f("ix_organizations_slug"), "organizations", ["slug"], unique=False)

    op.create_table(
        "organization_memberships",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("assigned_at", sa.DateTime(), nullable=False),
        sa.Column("assigned_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["assigned_by"], ["user.id"]),
        sa.UniqueConstraint("user_id", "organization_id", name="uq_org_memberships_user_org"),
    )
    op.create_index(
        op.f("ix_org_memberships_user_id"),
        "organization_memberships",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_org_memberships_organization_id"),
        "organization_memberships",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_org_memberships_role_id"),
        "organization_memberships",
        ["role_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_org_memberships_role_id"), table_name="organization_memberships")
    op.drop_index(op.f("ix_org_memberships_organization_id"), table_name="organization_memberships")
    op.drop_index(op.f("ix_org_memberships_user_id"), table_name="organization_memberships")
    op.drop_table("organization_memberships")

    op.drop_index(op.f("ix_organizations_slug"), table_name="organizations")
    op.drop_index(op.f("ix_organizations_name"), table_name="organizations")
    op.drop_table("organizations")