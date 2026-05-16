"""add pace_days non-negative check constraint

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-16

"""

from collections.abc import Sequence

from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_reading_logs_pace_days_non_negative",
        "reading_logs",
        "pace_days IS NULL OR pace_days >= 0",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_reading_logs_pace_days_non_negative",
        "reading_logs",
        type_="check",
    )
