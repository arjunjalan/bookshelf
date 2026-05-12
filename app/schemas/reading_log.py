import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.reading_log import ReadingStatus


class ReadingLogCreate(BaseModel):
    book_id: uuid.UUID
    status: ReadingStatus
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = None
    mood: Optional[str] = None


class ReadingLogRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    book_id: uuid.UUID
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
