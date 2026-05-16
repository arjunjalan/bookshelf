import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.reading_log import ReadingStatus


class BookSummary(BaseModel):
    id: uuid.UUID
    title: str
    author: str
    cover_url: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class ReadingLogCreate(BaseModel):
    book_id: uuid.UUID
    status: ReadingStatus
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = None
    mood: Optional[str] = None

    @model_validator(mode='after')
    def check_date_ordering(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError('end_date must not be before start_date')
        return self


class ReadingLogRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    book_id: uuid.UUID
    book: BookSummary
    status: ReadingStatus
    start_date: Optional[date]
    end_date: Optional[date]
    rating: Optional[int]
    notes: Optional[str]
    pace_days: Optional[int]
    mood: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReadingLogUpdate(BaseModel):
    status: Optional[ReadingStatus] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = None
    mood: Optional[str] = None

    @model_validator(mode='after')
    def check_date_ordering(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError('end_date must not be before start_date')
        return self
