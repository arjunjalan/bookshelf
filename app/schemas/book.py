import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class BookCreate(BaseModel):
    title: str
    author: str
    genre: Optional[str] = None
    isbn: Optional[str] = None
    cover_url: Optional[str] = None
    description: Optional[str] = None
    page_count: Optional[int] = None
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


class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    genre: Optional[str] = None
    isbn: Optional[str] = None
    cover_url: Optional[str] = None
    description: Optional[str] = None
    page_count: Optional[int] = None
    published_date: Optional[date] = None
