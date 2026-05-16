from typing import Optional

from pydantic import BaseModel


class GenreAffinity(BaseModel):
    genre: str
    books_read: int
    avg_rating: Optional[float]


class AuthorAffinity(BaseModel):
    author: str
    books_read: int
    avg_rating: Optional[float]


class PaceByGenre(BaseModel):
    genre: str
    avg_days: Optional[float]


class ReaderProfile(BaseModel):
    top_genres: list[GenreAffinity]
    top_authors: list[AuthorAffinity]
    rating_distribution: dict[str, int]
    pace_by_genre: list[PaceByGenre]
