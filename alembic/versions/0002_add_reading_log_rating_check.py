"""add reading log rating check

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-11

"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_reading_logs_rating_1_5",
        "reading_logs",
        "rating IS NULL OR rating BETWEEN 1 AND 5",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_reading_logs_rating_1_5",
        "reading_logs",
        type_="check",
    )
