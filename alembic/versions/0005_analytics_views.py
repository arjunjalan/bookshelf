"""add analytics views

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-15

"""

from collections.abc import Sequence

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE VIEW v_books_per_month AS
        SELECT
            rl.user_id,
            DATE_TRUNC('month', rl.end_date)::date AS month,
            COUNT(*) AS books_finished
        FROM reading_logs rl
        WHERE rl.status = 'read'
          AND rl.end_date IS NOT NULL
        GROUP BY rl.user_id, DATE_TRUNC('month', rl.end_date)
        ORDER BY rl.user_id, DATE_TRUNC('month', rl.end_date)
        """
    )
    op.execute(
        """
        CREATE OR REPLACE VIEW v_reading_pace AS
        SELECT
            rl.user_id,
            b.title,
            (rl.end_date - rl.start_date)::int AS days_to_finish
        FROM reading_logs rl
        JOIN books b ON rl.book_id = b.id
        WHERE rl.status = 'read'
          AND rl.start_date IS NOT NULL
          AND rl.end_date IS NOT NULL
        ORDER BY rl.end_date DESC
        """
    )
    op.execute(
        """
        CREATE OR REPLACE VIEW v_genre_breakdown AS
        SELECT
            rl.user_id,
            b.genre,
            COUNT(*) AS books_read
        FROM reading_logs rl
        JOIN books b ON rl.book_id = b.id
        WHERE rl.status = 'read'
          AND b.genre IS NOT NULL
        GROUP BY rl.user_id, b.genre
        ORDER BY rl.user_id, COUNT(*) DESC
        """
    )
    op.execute(
        """
        CREATE OR REPLACE VIEW v_author_breakdown AS
        SELECT
            rl.user_id,
            b.author,
            COUNT(*) AS books_read
        FROM reading_logs rl
        JOIN books b ON rl.book_id = b.id
        WHERE rl.status = 'read'
        GROUP BY rl.user_id, b.author
        ORDER BY rl.user_id, COUNT(*) DESC
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_author_breakdown")
    op.execute("DROP VIEW IF EXISTS v_genre_breakdown")
    op.execute("DROP VIEW IF EXISTS v_reading_pace")
    op.execute("DROP VIEW IF EXISTS v_books_per_month")
