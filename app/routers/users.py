import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.social import UserProfilePublic, UserSearchResult
from app.services import social as social_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search", response_model=list[UserSearchResult])
def search_users(
    q: str = Query(..., min_length=1, max_length=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    results = social_service.search_users(db, q)
    return [
        UserSearchResult(
            handle=profile.handle,
            display_name=profile.display_name,
            avatar_url=profile.avatar_url,
            follower_count=count,
            is_following=social_service.is_following(db, current_user.id, profile.user_id),
        )
        for profile, count in results
        if profile.user_id != current_user.id
    ]


@router.get("/{handle}", response_model=UserProfilePublic)
def get_user_profile(
    handle: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = social_service.get_profile_by_handle(db, handle)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserProfilePublic(
        handle=profile.handle,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        follower_count=social_service.get_follower_count(db, profile.user_id),
        following_count=social_service.get_following_count(db, profile.user_id),
        is_following=social_service.is_following(db, current_user.id, profile.user_id),
    )


@router.post("/{handle}/follow", status_code=status.HTTP_201_CREATED)
def follow_user(
    handle: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = social_service.get_profile_by_handle(db, handle)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if profile.user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot follow yourself")
    social_service.follow(db, current_user.id, profile.user_id)
    logger.info("User %s followed @%s", current_user.id, handle)
    return {"following": True}


@router.delete("/{handle}/follow", status_code=status.HTTP_204_NO_CONTENT)
def unfollow_user(
    handle: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = social_service.get_profile_by_handle(db, handle)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    social_service.unfollow(db, current_user.id, profile.user_id)
    logger.info("User %s unfollowed @%s", current_user.id, handle)
