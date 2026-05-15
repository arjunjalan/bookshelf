"""books isbn unique per user

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-15

"""

from collections.abc import Sequence

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index("ix_books_isbn", table_name="books")
    op.create_index(
        "uq_books_user_isbn",
        "books",
        ["user_id", "isbn"],
        unique=True,
        postgresql_where="isbn IS NOT NULL",
    )


def downgrade() -> None:
    op.drop_index("uq_books_user_isbn", table_name="books")
    op.create_index("ix_books_isbn", "books", ["isbn"], unique=True)
