"""add reader profile views

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-16

"""

from collections.abc import Sequence

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE VIEW v_genre_affinity AS
        SELECT
            rl.user_id,
            b.genre,
            COUNT(*) AS books_read,
            AVG(rl.rating) AS avg_rating
        FROM reading_logs rl
        JOIN books b ON rl.book_id = b.id
        WHERE rl.status = 'read'
          AND b.genre IS NOT NULL
        GROUP BY rl.user_id, b.genre
        """
    )
    op.execute(
        """
        CREATE OR REPLACE VIEW v_author_affinity AS
        SELECT
            rl.user_id,
            b.author,
            COUNT(*) AS books_read,
            AVG(rl.rating) AS avg_rating
        FROM reading_logs rl
        JOIN books b ON rl.book_id = b.id
        WHERE rl.status = 'read'
        GROUP BY rl.user_id, b.author
        """
    )
    op.execute(
        """
        CREATE OR REPLACE VIEW v_pace_by_genre AS
        SELECT
            rl.user_id,
            b.genre,
            AVG(rl.pace_days) AS avg_days
        FROM reading_logs rl
        JOIN books b ON rl.book_id = b.id
        WHERE rl.status = 'read'
          AND rl.pace_days IS NOT NULL
          AND b.genre IS NOT NULL
        GROUP BY rl.user_id, b.genre
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_pace_by_genre")
    op.execute("DROP VIEW IF EXISTS v_author_affinity")
    op.execute("DROP VIEW IF EXISTS v_genre_affinity")
