"""drop meeting participant count columns

Revision ID: 20260414_010
Revises: 20260414_009
Create Date: 2026-04-14 12:05:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260414_010"
down_revision = "20260414_009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("meetings", "participant_count_planned")
    op.drop_column("meetings", "participant_count_actual")


def downgrade() -> None:
    op.add_column("meetings", sa.Column("participant_count_actual", sa.Integer(), nullable=True))
    op.add_column("meetings", sa.Column("participant_count_planned", sa.Integer(), nullable=True))
