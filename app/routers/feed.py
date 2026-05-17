import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.social import BookMiniRead, FeedActorRead, FeedEventRead, FeedPage
from app.services import feed_events as feed_events_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feed", tags=["feed"])


@router.get("", response_model=FeedPage)
def get_feed(
    cursor: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        events, next_cursor = feed_events_service.get_feed(db, current_user.id, cursor, limit)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid cursor")

    items = []
    for event in events:
        if event.user is None:
            logger.warning("Feed event %s has no user — skipping", event.id)
            continue
        actor_handle = event.user.profile.handle if event.user.profile else event.user.email.split("@")[0]
        actor_display_name = event.user.profile.display_name if event.user.profile else None
        actor_avatar_url = event.user.profile.avatar_url if event.user.profile else None
        items.append(FeedEventRead(
            id=event.id,
            user_id=event.user_id,
            actor=FeedActorRead(
                handle=actor_handle,
                display_name=actor_display_name,
                avatar_url=actor_avatar_url,
            ),
            event_type=event.event_type,
            book=BookMiniRead(
                id=event.book.id,
                title=event.book.title,
                author=event.book.author,
                cover_url=event.book.cover_url,
            ),
            payload=event.payload,
            created_at=event.created_at,
        ))

    return FeedPage(items=items, next_cursor=next_cursor)
