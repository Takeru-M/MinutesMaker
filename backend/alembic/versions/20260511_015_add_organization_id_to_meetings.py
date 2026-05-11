"""add organization_id to meetings

Revision ID: 20260511_015
Revises: 20260420_014
Create Date: 2026-05-11 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260511_015"
down_revision = "20260420_014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "meetings",
        sa.Column("organization_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_meetings_organization_id",
        "meetings",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(op.f("ix_meetings_organization_id"), "meetings", ["organization_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_meetings_organization_id"), table_name="meetings")
    op.drop_constraint("fk_meetings_organization_id", "meetings", type_="foreignkey")
    op.drop_column("meetings", "organization_id")
