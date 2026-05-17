#!/usr/bin/env python
import argparse
import logging
from dataclasses import dataclass

from dotenv import load_dotenv
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_session_factory
from app.models.book import Book
from app.models.user import User
from app.services.metadata_enrichment import enrich_book_metadata

logger = logging.getLogger(__name__)


@dataclass
class BackfillSummary:
    considered: int = 0
    updated: int = 0
    unchanged: int = 0
    failed: int = 0


def _metadata_snapshot(book: Book) -> tuple:
    return (book.cover_url, book.description, book.page_count, book.published_date)


def _query_candidates(db: Session, *, email: str | None, limit: int):
    query = (
        db.query(Book)
        .join(User, Book.user_id == User.id)
        .filter(
            or_(
                Book.cover_url.is_(None),
                Book.cover_url == "",
                Book.description.is_(None),
                Book.description == "",
            )
        )
        .order_by(Book.created_at.desc())
    )
    if email:
        query = query.filter(User.email == email)
    return query.limit(limit).all()


def backfill_metadata(
    db: Session,
    *,
    email: str | None,
    limit: int,
    dry_run: bool = False,
) -> BackfillSummary:
    summary = BackfillSummary()
    books = _query_candidates(db, email=email, limit=limit)

    for book in books:
        summary.considered += 1
        if dry_run:
            logger.info("Would enrich %s by %s (%s)", book.title, book.author, book.id)
            continue

        before = _metadata_snapshot(book)
        try:
            enriched = enrich_book_metadata(db, book.user_id, book.id)
            if enriched is None:
                summary.unchanged += 1
                logger.info("Skipped missing book %s", book.id)
                continue

            after = _metadata_snapshot(enriched)
            if after != before:
                summary.updated += 1
                logger.info("Updated %s by %s (%s)", enriched.title, enriched.author, enriched.id)
            else:
                summary.unchanged += 1
                logger.info("No metadata found for %s by %s (%s)", book.title, book.author, book.id)
        except Exception:
            summary.failed += 1
            logger.info("Failed to enrich book %s", book.id, exc_info=True)

    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Backfill missing Open Library metadata for existing books.")
    parser.add_argument("--email", help="Only backfill books owned by this user email.")
    parser.add_argument("--limit", type=int, default=50, help="Maximum number of candidate books to process.")
    parser.add_argument("--dry-run", action="store_true", help="List candidate books without calling Open Library.")
    args = parser.parse_args()

    if args.limit < 1:
        parser.error("--limit must be at least 1")

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    load_dotenv()

    db = get_session_factory()()
    try:
        summary = backfill_metadata(db, email=args.email, limit=args.limit, dry_run=args.dry_run)
    finally:
        db.close()

    print(
        "Metadata backfill complete: "
        f"considered={summary.considered} "
        f"updated={summary.updated} "
        f"unchanged={summary.unchanged} "
        f"failed={summary.failed}"
    )
    return 1 if summary.failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
