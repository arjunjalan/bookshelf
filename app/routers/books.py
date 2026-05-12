import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.book import Book
from app.models.user import User
from app.schemas.book import BookCreate, BookRead, BookUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/books", tags=["books"])


@router.post("", response_model=BookRead, status_code=status.HTTP_201_CREATED)
def create_book(
    body: BookCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    book = Book(**body.model_dump())
    db.add(book)
    db.commit()
    db.refresh(book)
    logger.info("Created book %s", book.id)
    return book


@router.get("", response_model=list[BookRead])
def list_books(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Book).order_by(Book.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{book_id}", response_model=BookRead)
def get_book(
    book_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    return book


@router.patch("/{book_id}", response_model=BookRead)
def update_book(
    book_id: uuid.UUID,
    body: BookUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(book, field, value)
    db.commit()
    db.refresh(book)
    return book


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(
    book_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    db.delete(book)
    db.commit()
