import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class BookCreate(BaseModel):
    title: str = Field(min_length=1)
    author: str = Field(min_length=1)
    genre: Optional[str] = None
    isbn: Optional[str] = None
    cover_url: Optional[str] = None
    description: Optional[str] = None
    page_count: Optional[int] = Field(default=None, ge=1)
    published_date: Optional[date] = None


class BookRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    author: str
    genre: Optional[str]
    isbn: Optional[str]
    cover_url: Optional[str]
    description: Optional[str]
    page_count: Optional[int]
    published_date: Optional[date]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BookSearchResult(BaseModel):
    title: str
    author: str
    isbn: Optional[str] = None
    cover_url: Optional[str] = None
    description: Optional[str] = None
    page_count: Optional[int] = None
    published_date: Optional[date] = None


class BookSearchPage(BaseModel):
    results: list[BookSearchResult]
    total: int
    offset: int
    limit: int
    has_more: bool


class BookUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1)
    author: Optional[str] = Field(default=None, min_length=1)
    genre: Optional[str] = None
    isbn: Optional[str] = None
    cover_url: Optional[str] = None
    description: Optional[str] = None
    page_count: Optional[int] = Field(default=None, ge=1)
    published_date: Optional[date] = None
