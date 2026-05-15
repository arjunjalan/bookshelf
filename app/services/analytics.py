import logging
import uuid
from typing import Optional

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.models.book import Book
from app.models.reading_log import ReadingLog, ReadingStatus

logger = logging.getLogger(__name__)


def get_summary(db: Session, user_id: uuid.UUID) -> dict:
    base = db.query(ReadingLog).filter(
        ReadingLog.user_id == user_id,
        ReadingLog.status == ReadingStatus.READ,
    )

    total_books_read: int = base.count()

    avg_rating_row = base.with_entities(func.avg(ReadingLog.rating)).scalar()
    avg_rating: Optional[float] = float(avg_rating_row) if avg_rating_row is not None else None

    avg_days_row = base.with_entities(func.avg(ReadingLog.pace_days)).scalar()
    avg_days_per_book: Optional[float] = float(avg_days_row) if avg_days_row is not None else None

    top_genre_row = (
        db.query(Book.genre, func.count(ReadingLog.id).label("cnt"))
        .join(ReadingLog, ReadingLog.book_id == Book.id)
        .filter(
            ReadingLog.user_id == user_id,
            ReadingLog.status == ReadingStatus.READ,
            Book.genre.isnot(None),
        )
        .group_by(Book.genre)
        .order_by(func.count(ReadingLog.id).desc())
        .first()
    )
    top_genre: Optional[str] = top_genre_row[0] if top_genre_row is not None else None

    return {
        "total_books_read": total_books_read,
        "avg_rating": avg_rating,
        "avg_days_per_book": avg_days_per_book,
        "top_genre": top_genre,
    }


def get_books_over_time(db: Session, user_id: uuid.UUID) -> list[dict]:
    rows = db.execute(
        text(
            "SELECT month, books_finished"
            " FROM v_books_per_month"
            " WHERE user_id = :uid"
            " ORDER BY month ASC"
        ),
        {"uid": user_id},
    ).mappings().all()
    return [{"month": str(row["month"]), "books_finished": row["books_finished"]} for row in rows]


def get_by_genre(db: Session, user_id: uuid.UUID) -> list[dict]:
    rows = db.execute(
        text(
            "SELECT genre, books_read"
            " FROM v_genre_breakdown"
            " WHERE user_id = :uid"
            " ORDER BY books_read DESC"
        ),
        {"uid": user_id},
    ).mappings().all()
    return [{"genre": row["genre"], "books_read": row["books_read"]} for row in rows]


def get_by_author(db: Session, user_id: uuid.UUID) -> list[dict]:
    rows = db.execute(
        text(
            "SELECT author, books_read"
            " FROM v_author_breakdown"
            " WHERE user_id = :uid"
            " ORDER BY books_read DESC"
        ),
        {"uid": user_id},
    ).mappings().all()
    return [{"author": row["author"], "books_read": row["books_read"]} for row in rows]


def get_pace(db: Session, user_id: uuid.UUID) -> list[dict]:
    rows = db.execute(
        text(
            "SELECT title, days_to_finish"
            " FROM v_reading_pace"
            " WHERE user_id = :uid"
        ),
        {"uid": user_id},
    ).mappings().all()
    return [{"title": row["title"], "days_to_finish": row["days_to_finish"]} for row in rows]
