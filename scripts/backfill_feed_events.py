#!/usr/bin/env python
"""Backfill feed events for existing reading logs.

Run once after deploying the social layer. Running more than once will create
duplicate status events (started/finished/want_to_read); rated events are
idempotent via the partial unique index.
"""
import argparse
import logging
from dataclasses import dataclass

from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.database import get_session_factory
from app.models.reading_log import ReadingLog
from app.models.user import User
from app.services import feed_events as feed_events_service

logger = logging.getLogger(__name__)


@dataclass
class BackfillSummary:
    users_considered: int = 0
    logs_processed: int = 0
    failed: int = 0


def backfill_feed_events(
    db: Session,
    *,
    email: str | None,
    dry_run: bool = False,
) -> BackfillSummary:
    summary = BackfillSummary()

    q = db.query(User)
    if email:
        q = q.filter(User.email == email)

    for user in q.all():
        summary.users_considered += 1
        logs = db.query(ReadingLog).filter(ReadingLog.user_id == user.id).all()
        if not logs:
            continue

        if dry_run:
            logger.info("Would process %d logs for %s", len(logs), user.email)
            summary.logs_processed += len(logs)
            continue

        user_failed = False
        for log in logs:
            summary.logs_processed += 1
            try:
                feed_events_service.generate_events_for_create(db, user.id, log)
            except Exception:
                summary.failed += 1
                logger.info("Failed for log %s (user %s)", log.id, user.email, exc_info=True)
                user_failed = True

        try:
            db.commit()
            logger.info("Committed events for %s (%d logs)", user.email, len(logs))
        except Exception:
            db.rollback()
            if not user_failed:
                summary.failed += len(logs)
            logger.info("Failed to commit for user %s", user.email, exc_info=True)

    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Backfill feed events for existing reading logs.")
    parser.add_argument("--email", help="Only backfill logs for this user email.")
    parser.add_argument("--dry-run", action="store_true", help="List candidates without writing events.")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    load_dotenv()

    db = get_session_factory()()
    try:
        summary = backfill_feed_events(db, email=args.email, dry_run=args.dry_run)
    finally:
        db.close()

    print(
        "Feed event backfill complete: "
        f"users_considered={summary.users_considered} "
        f"logs_processed={summary.logs_processed} "
        f"failed={summary.failed}"
    )
    return 1 if summary.failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
