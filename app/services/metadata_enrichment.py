import logging
import uuid
from collections.abc import Callable

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.adapters import get_metadata_adapter
from app.adapters.metadata import MetadataAdapter, MetadataResult
from app.database import get_session_factory
from app.models.book import Book

logger = logging.getLogger(__name__)


def _search_candidates(book: Book, adapter: MetadataAdapter) -> list[MetadataResult]:
    queries = []
    if book.isbn:
        queries.append(book.isbn)
    queries.append(f"{book.title} {book.author}")

    seen = set()
    results: list[MetadataResult] = []
    for query in queries:
        normalized = query.strip().lower()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        try:
            results.extend(adapter.search(query, limit=5, lite=False))
        except Exception:
            logger.info("Metadata enrichment search failed for query %r", query, exc_info=True)
    return results


def _score_candidate(book: Book, result: MetadataResult) -> tuple[int, int]:
    score = 0
    if book.isbn and result.isbn and book.isbn == result.isbn:
        score += 100
    if book.title.casefold() == result.title.casefold():
        score += 20
    elif book.title.casefold() in result.title.casefold() or result.title.casefold() in book.title.casefold():
        score += 10
    if book.author.casefold() == result.author.casefold():
        score += 20
    elif book.author.casefold() in result.author.casefold() or result.author.casefold() in book.author.casefold():
        score += 10

    metadata_count = sum(
        value is not None
        for value in (result.cover_url, result.description, result.page_count, result.published_date)
    )
    return score, metadata_count


def _best_match(book: Book, results: list[MetadataResult]) -> MetadataResult | None:
    if not results:
        return None

    scored = sorted(results, key=lambda result: _score_candidate(book, result), reverse=True)
    best = scored[0]
    score, _ = _score_candidate(book, best)
    return best if score > 0 else None


def _is_missing(value) -> bool:
    return value is None or value == ""


def enrich_book_metadata(
    db: Session,
    user_id: uuid.UUID,
    book_id: uuid.UUID,
    adapter: MetadataAdapter | None = None,
) -> Book | None:
    book = db.query(Book).filter(Book.id == book_id, Book.user_id == user_id).first()
    if book is None:
        return None

    metadata_values = (book.cover_url, book.description, book.page_count, book.published_date)
    if all(not _is_missing(value) for value in metadata_values):
        return book

    adapter = adapter or get_metadata_adapter()
    match = _best_match(book, _search_candidates(book, adapter))
    if match is None:
        logger.info("No metadata enrichment match found for book %s", book_id)
        return book

    changed = False
    for field in ("cover_url", "description", "page_count", "published_date"):
        if _is_missing(getattr(book, field)) and not _is_missing(getattr(match, field)):
            setattr(book, field, getattr(match, field))
            changed = True

    if changed:
        db.commit()
        db.refresh(book)
        logger.info("Enriched metadata for book %s", book_id)

    return book


def enrich_book_metadata_task(user_id: uuid.UUID, book_id: uuid.UUID) -> None:
    db = get_session_factory()()
    try:
        enrich_book_metadata(db, user_id, book_id)
    except Exception:
        logger.info("Background metadata enrichment failed for book %s", book_id, exc_info=True)
    finally:
        db.close()


def schedule_book_metadata_enrichment(
    background_tasks: BackgroundTasks,
    user_id: uuid.UUID,
    book_id: uuid.UUID,
) -> None:
    background_tasks.add_task(enrich_book_metadata_task, user_id, book_id)


MetadataEnrichmentScheduler = Callable[[BackgroundTasks, uuid.UUID, uuid.UUID], None]


def get_metadata_enrichment_scheduler() -> MetadataEnrichmentScheduler:
    return schedule_book_metadata_enrichment
