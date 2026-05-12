import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, String, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .reading_log import ReadingLog

reading_log_tags = Table(
    "reading_log_tags",
    Base.metadata,
    Column(
        "reading_log_id",
        UUID(as_uuid=True),
        ForeignKey("reading_logs.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        UUID(as_uuid=True),
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)

    reading_logs: Mapped[list["ReadingLog"]] = relationship(
        "ReadingLog", secondary=reading_log_tags, back_populates="tags"
    )
