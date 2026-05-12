import logging
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.reading_log import ReadingLog, ReadingStatus
from app.models.user import User
from app.schemas.reading_log import ReadingLogCreate, ReadingLogRead, ReadingLogUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reading-logs", tags=["reading-logs"])


def _compute_pace(start_date: Optional[date], end_date: Optional[date]) -> Optional[int]:
    if start_date and end_date:
        return (end_date - start_date).days
    return None


@router.post("", response_model=ReadingLogRead, status_code=status.HTTP_201_CREATED)
def create_reading_log(
    body: ReadingLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = ReadingLog(
        user_id=current_user.id,
        pace_days=_compute_pace(body.start_date, body.end_date),
        **body.model_dump(),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    logger.info("Created reading log %s for user %s", log.id, current_user.id)
    return log


@router.get("", response_model=list[ReadingLogRead])
def list_reading_logs(
    status_filter: Optional[ReadingStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(ReadingLog).filter(ReadingLog.user_id == current_user.id)
    if status_filter is not None:
        q = q.filter(ReadingLog.status == status_filter)
    return q.order_by(ReadingLog.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{log_id}", response_model=ReadingLogRead)
def get_reading_log(
    log_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = (
        db.query(ReadingLog)
        .filter(ReadingLog.id == log_id, ReadingLog.user_id == current_user.id)
        .first()
    )
    if log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading log not found")
    return log


@router.patch("/{log_id}", response_model=ReadingLogRead)
def update_reading_log(
    log_id: uuid.UUID,
    body: ReadingLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = (
        db.query(ReadingLog)
        .filter(ReadingLog.id == log_id, ReadingLog.user_id == current_user.id)
        .first()
    )
    if log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading log not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(log, field, value)

    # Recompute pace_days whenever dates may have changed
    log.pace_days = _compute_pace(log.start_date, log.end_date)

    db.commit()
    db.refresh(log)
    return log
