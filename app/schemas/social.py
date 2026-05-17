import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.feed_event import EventType

HANDLE_PATTERN = r"^[a-z0-9_]{1,30}$"


class HandleCheckResponse(BaseModel):
    available: bool


class UserProfileCreate(BaseModel):
    handle: str = Field(..., pattern=HANDLE_PATTERN)
    display_name: Optional[str] = Field(default=None, max_length=100)
    bio: Optional[str] = None
    top_genres: list[str] = Field(default_factory=list)
    favourite_authors: list[str] = Field(default_factory=list)


class UserProfileUpdate(BaseModel):
    handle: Optional[str] = Field(default=None, pattern=HANDLE_PATTERN)
    display_name: Optional[str] = Field(default=None, max_length=100)
    bio: Optional[str] = None
    top_genres: Optional[list[str]] = None
    favourite_authors: Optional[list[str]] = None


class UserProfileMeRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    handle: str
    display_name: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]
    top_genres: list[str]
    favourite_authors: list[str]
    follower_count: int
    following_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfilePublic(BaseModel):
    handle: str
    display_name: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]
    follower_count: int
    following_count: int
    is_following: bool


class UserSearchResult(BaseModel):
    handle: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    follower_count: int
    is_following: bool


class FeedActorRead(BaseModel):
    handle: str
    display_name: Optional[str]
    avatar_url: Optional[str]


class BookMiniRead(BaseModel):
    id: uuid.UUID
    title: str
    author: str
    cover_url: Optional[str]


class FeedEventRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    actor: FeedActorRead
    event_type: EventType
    book: BookMiniRead
    payload: Optional[dict]
    created_at: datetime


class FeedPage(BaseModel):
    items: list[FeedEventRead]
    next_cursor: Optional[str]
