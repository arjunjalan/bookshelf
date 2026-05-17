import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.book import Book
from app.models.user import User
from app.schemas.book import BookCreate, BookRead, BookUpdate
from app.services.metadata_enrichment import (
    MetadataEnrichmentScheduler,
    get_metadata_enrichment_scheduler,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/books", tags=["books"])


@router.post("", response_model=BookRead, status_code=status.HTTP_201_CREATED)
def create_book(
    body: BookCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    schedule_metadata_enrichment: MetadataEnrichmentScheduler = Depends(
        get_metadata_enrichment_scheduler
    ),
):
    book = Book(**body.model_dump(), user_id=current_user.id)
    db.add(book)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A book with this ISBN already exists")
    db.refresh(book)
    schedule_metadata_enrichment(background_tasks, current_user.id, book.id)
    logger.info("Created book %s", book.id)
    return BookRead.model_validate(book)


@router.get("", response_model=list[BookRead])
def list_books(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    books = (
        db.query(Book)
        .filter(Book.user_id == current_user.id)
        .order_by(Book.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [BookRead.model_validate(book) for book in books]


@router.get("/{book_id}", response_model=BookRead)
def get_book(
    book_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    book = db.query(Book).filter(Book.id == book_id, Book.user_id == current_user.id).first()
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    return BookRead.model_validate(book)


@router.patch("/{book_id}", response_model=BookRead)
def update_book(
    book_id: uuid.UUID,
    body: BookUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    book = db.query(Book).filter(Book.id == book_id, Book.user_id == current_user.id).first()
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(book, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A book with this ISBN already exists")
    db.refresh(book)
    return BookRead.model_validate(book)


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(
    book_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    book = db.query(Book).filter(Book.id == book_id, Book.user_id == current_user.id).first()
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    db.delete(book)
    db.commit()
