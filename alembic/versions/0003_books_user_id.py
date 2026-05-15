"""add user_id to books

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-15

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("DELETE FROM reading_logs")
    op.execute("DELETE FROM books")
    op.add_column(
        "books",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
    )
    op.create_foreign_key(
        "fk_books_user_id",
        "books",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_books_user_id", "books", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_books_user_id", table_name="books")
    op.drop_constraint("fk_books_user_id", "books", type_="foreignkey")
    op.drop_column("books", "user_id")
