"""add social layer: user_profiles, follows, feed_events

Revision ID: 0009
Revises: 0008
Create Date: 2026-05-17

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_event_type = postgresql.ENUM(
    "started", "finished", "rated", "want_to_read",
    name="eventtype",
    create_type=False,
)


def upgrade() -> None:
    op.execute("CREATE TYPE eventtype AS ENUM ('started', 'finished', 'rated', 'want_to_read')")

    op.create_table(
        "user_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("handle", sa.String(30), nullable=False),
        sa.Column("display_name", sa.String(100), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("top_genres", postgresql.JSONB(), nullable=True),
        sa.Column("favourite_authors", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_user_profiles_user_id"),
        sa.UniqueConstraint("handle", name="uq_user_profiles_handle"),
    )
    op.create_index("ix_user_profiles_handle", "user_profiles", ["handle"])

    op.create_table(
        "follows",
        sa.Column("follower_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("followee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("follower_id", "followee_id"),
        sa.ForeignKeyConstraint(["follower_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["followee_id"], ["users.id"], ondelete="CASCADE"),
        sa.CheckConstraint("follower_id != followee_id", name="ck_follows_no_self_follow"),
    )
    op.create_index("ix_follows_follower_id", "follows", ["follower_id"])
    op.create_index("ix_follows_followee_id", "follows", ["followee_id"])

    op.create_table(
        "feed_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", _event_type, nullable=False),
        sa.Column("book_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reading_log_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("payload", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["book_id"], ["books.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reading_log_id"], ["reading_logs.id"], ondelete="SET NULL"),
    )
    op.execute("CREATE INDEX ix_feed_events_user_created ON feed_events (user_id, created_at DESC, id DESC)")
    op.execute("CREATE INDEX ix_feed_events_created ON feed_events (created_at DESC, id DESC)")
    op.execute(
        "CREATE UNIQUE INDEX uq_feed_events_rated ON feed_events (user_id, book_id) WHERE event_type = 'rated'"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_feed_events_rated")
    op.execute("DROP INDEX IF EXISTS ix_feed_events_created")
    op.execute("DROP INDEX IF EXISTS ix_feed_events_user_created")
    op.drop_table("feed_events")
    op.drop_index("ix_follows_followee_id", table_name="follows")
    op.drop_index("ix_follows_follower_id", table_name="follows")
    op.drop_table("follows")
    op.drop_index("ix_user_profiles_handle", table_name="user_profiles")
    op.drop_table("user_profiles")
    op.execute("DROP TYPE eventtype")
