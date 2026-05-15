import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.reading_log import ReadingStatus
from app.models.user import User
from app.schemas.reading_log import ReadingLogCreate, ReadingLogRead, ReadingLogUpdate
from app.services import reading_logs as reading_log_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reading-logs", tags=["reading-logs"])


@router.post("", response_model=ReadingLogRead, status_code=status.HTTP_201_CREATED)
def create_reading_log(
    body: ReadingLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = reading_log_service.create_reading_log(db, current_user.id, body)
    if log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    logger.info("Created reading log %s for user %s", log.id, current_user.id)
    return ReadingLogRead.model_validate(log)


@router.get("", response_model=list[ReadingLogRead])
def list_reading_logs(
    status_filter: Optional[ReadingStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = reading_log_service.list_reading_logs(
        db, current_user.id, status_filter, skip, limit
    )
    return [ReadingLogRead.model_validate(log) for log in logs]


@router.get("/{log_id}", response_model=ReadingLogRead)
def get_reading_log(
    log_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = reading_log_service.get_reading_log(db, current_user.id, log_id)
    if log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading log not found")
    return ReadingLogRead.model_validate(log)


@router.patch("/{log_id}", response_model=ReadingLogRead)
def update_reading_log(
    log_id: uuid.UUID,
    body: ReadingLogUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = reading_log_service.get_reading_log(db, current_user.id, log_id)
    if log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading log not found")

    log = reading_log_service.update_reading_log(db, log, body)
    return ReadingLogRead.model_validate(log)


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reading_log(
    log_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = reading_log_service.get_reading_log(db, current_user.id, log_id)
    if log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reading log not found")
    db.delete(log)
    db.commit()
    logger.info("Deleted reading log %s for user %s", log_id, current_user.id)
