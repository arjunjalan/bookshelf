import logging
import uuid

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.models.reading_log import ReadingLog, ReadingStatus

logger = logging.getLogger(__name__)


def _to_float(val) -> float | None:
    return float(val) if val is not None else None


def get_reader_profile(db: Session, user_id: uuid.UUID) -> dict:
    genre_rows = db.execute(
        text(
            "SELECT genre, books_read, avg_rating"
            " FROM v_genre_affinity"
            " WHERE user_id = :uid"
            " ORDER BY books_read DESC"
        ),
        {"uid": user_id},
    ).mappings().all()
    top_genres = [
        {
            "genre": r["genre"],
            "books_read": r["books_read"],
            "avg_rating": _to_float(r["avg_rating"]),
        }
        for r in genre_rows
    ]

    author_rows = db.execute(
        text(
            "SELECT author, books_read, avg_rating"
            " FROM v_author_affinity"
            " WHERE user_id = :uid"
            " ORDER BY books_read DESC"
        ),
        {"uid": user_id},
    ).mappings().all()
    top_authors = [
        {
            "author": r["author"],
            "books_read": r["books_read"],
            "avg_rating": _to_float(r["avg_rating"]),
        }
        for r in author_rows
    ]

    # rating_distribution is a simple group-by on the model — no view needed
    rating_counts: dict[str, int] = {str(i): 0 for i in range(1, 6)}
    rated_rows = (
        db.query(ReadingLog.rating, func.count(ReadingLog.id).label("cnt"))
        .filter(
            ReadingLog.user_id == user_id,
            ReadingLog.status == ReadingStatus.READ,
            ReadingLog.rating.isnot(None),
        )
        .group_by(ReadingLog.rating)
        .all()
    )
    for rating, cnt in rated_rows:
        rating_counts[str(rating)] = cnt

    pace_rows = db.execute(
        text(
            "SELECT genre, avg_days"
            " FROM v_pace_by_genre"
            " WHERE user_id = :uid"
            " ORDER BY genre ASC"
        ),
        {"uid": user_id},
    ).mappings().all()
    pace_by_genre = [
        {
            "genre": r["genre"],
            "avg_days": _to_float(r["avg_days"]),
        }
        for r in pace_rows
    ]

    return {
        "top_genres": top_genres,
        "top_authors": top_authors,
        "rating_distribution": rating_counts,
        "pace_by_genre": pace_by_genre,
    }
