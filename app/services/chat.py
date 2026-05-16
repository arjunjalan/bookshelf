import logging
import uuid
from collections.abc import Generator

from sqlalchemy.orm import Session

from app.adapters.llm import LLMAdapter
from app.models.book import Book
from app.models.reading_log import ReadingLog, ReadingStatus
from app.services import reader_profile as reader_profile_service

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are a personal reading companion. Answer questions about books, reading, \
and recommendations in a conversational, helpful tone. Be concise but not \
terse — aim for a short paragraph or a list of 2-4 items, each with a brief \
reason why it fits this reader. Skip lengthy preamble, but do explain your \
reasoning in one sentence per recommendation.

Here is the user's reading history and preferences:

Top genres: {genres}
Top authors: {authors}
Rating distribution: {ratings}
Average reading pace by genre: {pace}

Books on the user's shelf:
{books}\
"""


def _format_books(db: Session, user_id: uuid.UUID) -> str:
    rows = (
        db.query(ReadingLog, Book)
        .join(Book, ReadingLog.book_id == Book.id)
        .filter(ReadingLog.user_id == user_id)
        .order_by(ReadingLog.end_date.desc().nullslast())
        .all()
    )
    if not rows:
        return "none recorded"

    lines = []
    for log, book in rows:
        status_label = {
            ReadingStatus.READ: "read",
            ReadingStatus.READING: "currently reading",
            ReadingStatus.WANT_TO_READ: "want to read",
        }[log.status]
        parts = [f"- {book.title} by {book.author} ({status_label}"]
        if log.end_date:
            parts[0] += f", finished {log.end_date.strftime('%Y-%m-%d')}"
        if log.rating:
            parts[0] += f", rated {log.rating}/5"
        parts[0] += ")"
        lines.append(parts[0])
    return "\n".join(lines)


def _format_profile(profile: dict, books_text: str) -> str:
    genres = ", ".join(
        "{} ({} books{})".format(
            g["genre"],
            g["books_read"],
            f", avg rating {round(g['avg_rating'], 1)}" if g["avg_rating"] else "",
        )
        for g in profile["top_genres"]
    ) or "none recorded"

    authors = ", ".join(
        f"{a['author']} ({a['books_read']} books)" for a in profile["top_authors"]
    ) or "none recorded"

    ratings = ", ".join(
        f"{stars} stars: {count}"
        for stars, count in profile["rating_distribution"].items()
        if count > 0
    ) or "no ratings yet"

    pace = ", ".join(
        f"{p['genre']}: {round(p['avg_days'])} days"
        for p in profile["pace_by_genre"]
        if p["avg_days"]
    ) or "no pace data"

    return _SYSTEM_PROMPT.format(genres=genres, authors=authors, ratings=ratings, pace=pace, books=books_text)


def build_messages(
    db: Session,
    user_id: uuid.UUID,
    message: str,
    history: list[dict],
) -> list[dict]:
    profile = reader_profile_service.get_reader_profile(db, user_id)
    books_text = _format_books(db, user_id)
    system_content = _format_profile(profile, books_text)
    messages: list[dict] = [{"role": "system", "content": system_content}]
    messages.extend(history)
    messages.append({"role": "user", "content": message})
    return messages


def get_chat_response(
    db: Session,
    user_id: uuid.UUID,
    message: str,
    history: list[dict],
    llm: LLMAdapter,
) -> str:
    messages = build_messages(db, user_id, message, history)
    result = llm.chat(messages)
    return result.text


def get_chat_stream(messages: list[dict], llm: LLMAdapter) -> Generator[str, None, None]:
    yield from llm.chat_stream(messages)
