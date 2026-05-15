from typing import Optional

from pydantic import BaseModel


class SummaryStats(BaseModel):
    total_books_read: int
    avg_rating: Optional[float]
    avg_days_per_book: Optional[float]
    top_genre: Optional[str]


class BooksOverTimeItem(BaseModel):
    month: str
    books_finished: int


class GenreItem(BaseModel):
    genre: str
    books_read: int


class AuthorItem(BaseModel):
    author: str
    books_read: int


class PaceItem(BaseModel):
    title: str
    days_to_finish: int
