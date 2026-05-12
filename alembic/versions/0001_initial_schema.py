"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-11

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# create_type=False — enum DDL is managed explicitly via op.execute below so
# SQLAlchemy does not try to auto-emit CREATE/DROP TYPE around table operations.
_status_type = postgresql.ENUM(
    "read", "reading", "want_to_read", name="readingstatus", create_type=False
)


def upgrade() -> None:
    op.execute("CREATE TYPE readingstatus AS ENUM ('read', 'reading', 'want_to_read')")

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "books",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("author", sa.String(500), nullable=False),
        sa.Column("genre", sa.String(100)),
        sa.Column("isbn", sa.String(20)),
        sa.Column("cover_url", sa.String(2048)),
        sa.Column("description", sa.Text),
        sa.Column("page_count", sa.Integer),
        sa.Column("published_date", sa.Date),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_books_isbn", "books", ["isbn"], unique=True)

    op.create_table(
        "reading_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("book_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", _status_type, nullable=False),
        sa.Column("start_date", sa.Date),
        sa.Column("end_date", sa.Date),
        sa.Column("rating", sa.Integer),
        sa.Column("notes", sa.Text),
        sa.Column("pace_days", sa.Integer),
        sa.Column("mood", sa.String(100)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["book_id"], ["books.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reading_logs_user_id", "reading_logs", ["user_id"])
    op.create_index("ix_reading_logs_book_id", "reading_logs", ["book_id"])

    op.create_table(
        "tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tags_name", "tags", ["name"], unique=True)

    op.create_table(
        "reading_log_tags",
        sa.Column("reading_log_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tag_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["reading_log_id"], ["reading_logs.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("reading_log_id", "tag_id"),
    )


def downgrade() -> None:
    op.drop_table("reading_log_tags")
    op.drop_index("ix_tags_name", table_name="tags")
    op.drop_table("tags")
    op.drop_index("ix_reading_logs_book_id", table_name="reading_logs")
    op.drop_index("ix_reading_logs_user_id", table_name="reading_logs")
    op.drop_table("reading_logs")
    op.execute("DROP TYPE IF EXISTS readingstatus")
    op.drop_index("ix_books_isbn", table_name="books")
    op.drop_table("books")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
