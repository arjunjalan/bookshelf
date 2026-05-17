import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .book import Book
    from .reading_log import ReadingLog
    from .user import User


class EventType(str, enum.Enum):
    STARTED = "started"
    FINISHED = "finished"
    RATED = "rated"
    WANT_TO_READ = "want_to_read"


class FeedEvent(Base):
    __tablename__ = "feed_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[EventType] = mapped_column(
        Enum(EventType, name="eventtype", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE"), nullable=False
    )
    reading_log_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reading_logs.id", ondelete="SET NULL"), nullable=True
    )
    payload: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped["User"] = relationship("User")
    book: Mapped["Book"] = relationship("Book")
    reading_log: Mapped[Optional["ReadingLog"]] = relationship("ReadingLog")
