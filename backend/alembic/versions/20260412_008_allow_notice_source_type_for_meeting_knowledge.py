"""allow notice source_type for meeting knowledge

Revision ID: 20260412_008
Revises: 20260412_007
Create Date: 2026-04-12 18:30:00

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20260412_008"
down_revision: Union[str, None] = "20260412_007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_meeting_knowledge_sources_source_type",
        "meeting_knowledge_sources",
        type_="check",
    )
    op.create_check_constraint(
        "ck_meeting_knowledge_sources_source_type",
        "meeting_knowledge_sources",
        "source_type IN ('meeting', 'agenda', 'minutes', 'notice', 'content', 'content_attachment')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_meeting_knowledge_sources_source_type",
        "meeting_knowledge_sources",
        type_="check",
    )
    op.create_check_constraint(
        "ck_meeting_knowledge_sources_source_type",
        "meeting_knowledge_sources",
        "source_type IN ('meeting', 'agenda', 'minutes', 'content', 'content_attachment')",
    )
