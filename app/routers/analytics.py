import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.analytics import (
    AuthorItem,
    BooksOverTimeItem,
    GenreItem,
    PaceItem,
    SummaryStats,
)
from app.services import analytics as analytics_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=SummaryStats)
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info("Analytics summary requested for user %s", current_user.id)
    result = analytics_service.get_summary(db, current_user.id)
    return SummaryStats(**result)


@router.get("/books-over-time", response_model=list[BooksOverTimeItem])
def get_books_over_time(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info("Analytics books-over-time requested for user %s", current_user.id)
    rows = analytics_service.get_books_over_time(db, current_user.id)
    return [BooksOverTimeItem(**row) for row in rows]


@router.get("/by-genre", response_model=list[GenreItem])
def get_by_genre(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info("Analytics by-genre requested for user %s", current_user.id)
    rows = analytics_service.get_by_genre(db, current_user.id)
    return [GenreItem(**row) for row in rows]


@router.get("/by-author", response_model=list[AuthorItem])
def get_by_author(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info("Analytics by-author requested for user %s", current_user.id)
    rows = analytics_service.get_by_author(db, current_user.id)
    return [AuthorItem(**row) for row in rows]


@router.get("/pace", response_model=list[PaceItem])
def get_pace(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info("Analytics pace requested for user %s", current_user.id)
    rows = analytics_service.get_pace(db, current_user.id)
    return [PaceItem(**row) for row in rows]
