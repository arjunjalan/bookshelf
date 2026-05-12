import enum
import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base
from .book import Book
from .tag import Tag, reading_log_tags
from .user import User


class ReadingStatus(str, enum.Enum):
    READ = "read"
    READING = "reading"
    WANT_TO_READ = "want_to_read"


class ReadingLog(Base):
    __tablename__ = "reading_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[ReadingStatus] = mapped_column(
        Enum(ReadingStatus, name="readingstatus"), nullable=False
    )
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    end_date: Mapped[Optional[date]] = mapped_column(Date)
    rating: Mapped[Optional[int]] = mapped_column(Integer)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    pace_days: Mapped[Optional[int]] = mapped_column(Integer)
    mood: Mapped[Optional[str]] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped["User"] = relationship("User", back_populates="reading_logs")
    book: Mapped["Book"] = relationship("Book", back_populates="reading_logs")
    tags: Mapped[list["Tag"]] = relationship(
        "Tag", secondary=reading_log_tags, back_populates="reading_logs"
    )
