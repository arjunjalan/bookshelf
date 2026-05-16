import csv
import io
import logging
import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.book import Book
from app.models.reading_log import ReadingLog, ReadingStatus
from app.schemas.import_csv import ImportRowError, ImportSummary

logger = logging.getLogger(__name__)

_GOODREADS_MARKER = {"Book Id", "Exclusive Shelf"}

_SHELF_TO_STATUS = {
    "read": ReadingStatus.READ,
    "currently-reading": ReadingStatus.READING,
    "to-read": ReadingStatus.WANT_TO_READ,
}


def _strip_isbn(value: str) -> Optional[str]:
    """Goodreads wraps ISBNs as =\"...\" to prevent Excel scientific notation."""
    v = value.strip().strip('="').rstrip('"')
    return v if v else None


def _parse_date(value: str) -> Optional[date]:
    v = value.strip()
    if not v:
        return None
    try:
        return datetime.strptime(v, "%Y/%m/%d").date()
    except ValueError:
        return None


def _parse_year(value: str) -> Optional[date]:
    v = value.strip()
    if not v:
        return None
    try:
        year = int(v)
        if 1 <= year <= 9999:
            return date(year, 1, 1)
    except ValueError:
        pass
    return None


def _parse_rating(value: str) -> Optional[int]:
    v = value.strip()
    if not v or v == "0":
        return None
    try:
        r = int(v)
        return r if 1 <= r <= 5 else None
    except ValueError:
        return None


def _parse_page_count(value: str) -> Optional[int]:
    v = value.strip()
    if not v:
        return None
    try:
        n = int(v)
        return n if n >= 1 else None
    except ValueError:
        return None


def import_goodreads_csv(
    db: Session,
    user_id: uuid.UUID,
    content: bytes,
) -> ImportSummary:
    try:
        text = content.decode("utf-8-sig")  # strip BOM if present
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    headers = set(reader.fieldnames or [])

    if not _GOODREADS_MARKER.issubset(headers):
        raise ValueError(
            "File does not appear to be a Goodreads export. "
            "Export your library from Goodreads (My Books → Import/Export) and try again."
        )

    imported = 0
    skipped = 0
    errors: list[ImportRowError] = []

    for row_num, row in enumerate(reader, start=2):  # row 1 is header
        title = row.get("Title", "").strip()
        author = row.get("Author", "").strip()

        if not title or not author:
            errors.append(ImportRowError(row=row_num, reason="Missing title or author"))
            continue

        shelf = row.get("Exclusive Shelf", "").strip()
        status = _SHELF_TO_STATUS.get(shelf)
        if status is None:
            errors.append(ImportRowError(row=row_num, reason=f"Unknown shelf '{shelf}'"))
            continue

        # prefer ISBN13, fall back to ISBN
        isbn = _strip_isbn(row.get("ISBN13", "")) or _strip_isbn(row.get("ISBN", ""))
        page_count = _parse_page_count(row.get("Number of Pages", ""))
        published_date = _parse_year(row.get("Original Publication Year", ""))
        rating = _parse_rating(row.get("My Rating", ""))
        end_date = _parse_date(row.get("Date Read", ""))
        notes = row.get("My Review", "").strip() or None

        if isbn:
            existing = db.query(Book).filter(
                Book.user_id == user_id, Book.isbn == isbn
            ).first()
        else:
            existing = db.query(Book).filter(
                Book.user_id == user_id,
                Book.title == title,
                Book.author == author,
            ).first()
        if existing:
            skipped += 1
            continue

        book = Book(
            user_id=user_id,
            title=title,
            author=author,
            isbn=isbn,
            page_count=page_count,
            published_date=published_date,
        )
        db.add(book)
        log = ReadingLog(
            book=book,
            user_id=user_id,
            status=status,
            rating=rating,
            end_date=end_date,
            notes=notes,
        )
        db.add(log)
        try:
            db.commit()
            imported += 1
        except IntegrityError:
            db.rollback()
            skipped += 1
        except Exception as exc:
            db.rollback()
            logger.warning("Failed to commit row %d: %s", row_num, exc)
            errors.append(ImportRowError(row=row_num, reason="Failed to save — please try again"))

    return ImportSummary(imported=imported, skipped=skipped, errors=errors)
