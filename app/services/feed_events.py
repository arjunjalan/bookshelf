import base64
import json
import logging
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import or_, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, joinedload

from app.models.feed_event import EventType, FeedEvent
from app.models.reading_log import ReadingLog, ReadingStatus
from app.models.social import Follow
from app.models.user import User

logger = logging.getLogger(__name__)

_STATUS_TO_EVENT: dict[ReadingStatus, EventType] = {
    ReadingStatus.READING: EventType.STARTED,
    ReadingStatus.READ: EventType.FINISHED,
    ReadingStatus.WANT_TO_READ: EventType.WANT_TO_READ,
}


def _upsert_rated(
    db: Session,
    user_id: uuid.UUID,
    book_id: uuid.UUID,
    reading_log_id: uuid.UUID,
    rating: int,
) -> None:
    stmt = pg_insert(FeedEvent).values(
        id=uuid.uuid4(),
        user_id=user_id,
        event_type=EventType.RATED.value,
        book_id=book_id,
        reading_log_id=reading_log_id,
        payload={"rating": rating},
    ).on_conflict_do_update(
        index_elements=["user_id", "book_id"],
        index_where=text("event_type = 'rated'"),
        set_={"payload": {"rating": rating}, "reading_log_id": reading_log_id},
    )
    db.execute(stmt)


def generate_events_for_create(db: Session, user_id: uuid.UUID, log: ReadingLog) -> None:
    event_type = _STATUS_TO_EVENT.get(log.status)
    if event_type:
        db.add(FeedEvent(
            user_id=user_id,
            event_type=event_type,
            book_id=log.book_id,
            reading_log_id=log.id,
        ))
    if log.rating:
        _upsert_rated(db, user_id, log.book_id, log.id, log.rating)


def generate_events_for_update(
    db: Session,
    user_id: uuid.UUID,
    log: ReadingLog,
    old_status: ReadingStatus,
    old_rating: Optional[int],
) -> None:
    if log.status != old_status:
        event_type = _STATUS_TO_EVENT.get(log.status)
        if event_type:
            db.add(FeedEvent(
                user_id=user_id,
                event_type=event_type,
                book_id=log.book_id,
                reading_log_id=log.id,
            ))
    if log.rating is not None and log.rating != old_rating:
        _upsert_rated(db, user_id, log.book_id, log.id, log.rating)


def _encode_cursor(created_at: datetime, event_id: uuid.UUID) -> str:
    payload = json.dumps({"created_at": created_at.isoformat(), "id": str(event_id)})
    return base64.urlsafe_b64encode(payload.encode()).decode()


def _decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    try:
        payload = json.loads(base64.urlsafe_b64decode(cursor).decode())
        return datetime.fromisoformat(payload["created_at"]), uuid.UUID(payload["id"])
    except Exception as exc:
        raise ValueError(f"Invalid cursor: {exc}") from exc


def get_feed(
    db: Session,
    user_id: uuid.UUID,
    cursor: Optional[str],
    limit: int = 20,
) -> tuple[list[FeedEvent], Optional[str]]:
    q = (
        db.query(FeedEvent)
        .options(
            joinedload(FeedEvent.user).joinedload(User.profile),
            joinedload(FeedEvent.book),
        )
        .filter(
            or_(
                FeedEvent.user_id == user_id,
                FeedEvent.user_id.in_(
                    db.query(Follow.followee_id).filter(Follow.follower_id == user_id)
                ),
            )
        )
    )

    if cursor:
        cursor_dt, cursor_id = _decode_cursor(cursor)
        q = q.filter(
            or_(
                FeedEvent.created_at < cursor_dt,
                (FeedEvent.created_at == cursor_dt) & (FeedEvent.id < cursor_id),
            )
        )

    events = q.order_by(FeedEvent.created_at.desc(), FeedEvent.id.desc()).limit(limit + 1).all()

    next_cursor = None
    if len(events) > limit:
        last = events[limit - 1]
        next_cursor = _encode_cursor(last.created_at, last.id)
        events = events[:limit]

    return events, next_cursor
