"""expand minutes schema for small meeting detail

Revision ID: 20260411_005
Revises: 20260410_004
Create Date: 2026-04-11 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260411_005"
down_revision: Union[str, None] = "20260410_004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("uq_minutes_scope_entity", "minutes", type_="unique")
    op.add_column("minutes", sa.Column("content_type", sa.String(), nullable=False, server_default="text"))
    op.add_column("minutes", sa.Column("pdf_s3_key", sa.String(), nullable=True))
    op.add_column("minutes", sa.Column("pdf_url", sa.String(), nullable=True))
    op.create_index(op.f("ix_minutes_content_type"), "minutes", ["content_type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_minutes_content_type"), table_name="minutes")
    op.drop_column("minutes", "pdf_url")
    op.drop_column("minutes", "pdf_s3_key")
    op.drop_column("minutes", "content_type")
    op.create_unique_constraint("uq_minutes_scope_entity", "minutes", ["scope_type", "scope_entity_id"])
