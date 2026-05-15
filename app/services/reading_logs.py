import uuid
from datetime import date
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.book import Book
from app.models.reading_log import ReadingLog, ReadingStatus
from app.schemas.reading_log import ReadingLogCreate, ReadingLogUpdate


def compute_pace(start_date: Optional[date], end_date: Optional[date]) -> Optional[int]:
    if start_date and end_date:
        return (end_date - start_date).days
    return None


def _with_book(q):
    return q.options(joinedload(ReadingLog.book))


def create_reading_log(
    db: Session,
    user_id: uuid.UUID,
    body: ReadingLogCreate,
) -> Optional[ReadingLog]:
    if not db.query(Book).filter(Book.id == body.book_id, Book.user_id == user_id).first():
        return None
    log = ReadingLog(
        user_id=user_id,
        pace_days=compute_pace(body.start_date, body.end_date),
        **body.model_dump(),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    db.refresh(log, attribute_names=["book"])
    return log


def list_reading_logs(
    db: Session,
    user_id: uuid.UUID,
    status_filter: Optional[ReadingStatus],
    skip: int,
    limit: int,
) -> list[ReadingLog]:
    q = _with_book(db.query(ReadingLog).filter(ReadingLog.user_id == user_id))
    if status_filter is not None:
        q = q.filter(ReadingLog.status == status_filter)
    return q.order_by(ReadingLog.created_at.desc()).offset(skip).limit(limit).all()


def get_reading_log(
    db: Session,
    user_id: uuid.UUID,
    log_id: uuid.UUID,
) -> Optional[ReadingLog]:
    return (
        _with_book(db.query(ReadingLog))
        .filter(ReadingLog.id == log_id, ReadingLog.user_id == user_id)
        .first()
    )


def update_reading_log(
    db: Session,
    log: ReadingLog,
    body: ReadingLogUpdate,
) -> ReadingLog:
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(log, field, value)

    log.pace_days = compute_pace(log.start_date, log.end_date)

    db.commit()
    db.refresh(log)
    return log
