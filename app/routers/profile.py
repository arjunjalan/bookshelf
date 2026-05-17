import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.social import HandleCheckResponse, UserProfileCreate, UserProfileMeRead, UserProfileUpdate
from app.services import social as social_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/handle-check", response_model=HandleCheckResponse)
def check_handle(
    handle: str = Query(..., pattern=r"^[a-z0-9_]{1,30}$"),
    db: Session = Depends(get_db),
):
    return HandleCheckResponse(available=social_service.is_handle_available(db, handle))


@router.get("/me", response_model=UserProfileMeRead)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = social_service.get_profile(db, current_user.id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return UserProfileMeRead(
        id=profile.id,
        user_id=profile.user_id,
        handle=profile.handle,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        top_genres=profile.top_genres or [],
        favourite_authors=profile.favourite_authors or [],
        follower_count=social_service.get_follower_count(db, current_user.id),
        following_count=social_service.get_following_count(db, current_user.id),
        created_at=profile.created_at,
    )


@router.post("", response_model=UserProfileMeRead, status_code=status.HTTP_201_CREATED)
def create_profile(
    body: UserProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if social_service.get_profile(db, current_user.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Profile already exists")
    if not social_service.is_handle_available(db, body.handle):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Handle already taken")
    profile = social_service.create_profile(db, current_user.id, body)
    logger.info("Created profile for user %s with handle @%s", current_user.id, profile.handle)
    return UserProfileMeRead(
        id=profile.id,
        user_id=profile.user_id,
        handle=profile.handle,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        top_genres=profile.top_genres or [],
        favourite_authors=profile.favourite_authors or [],
        follower_count=0,
        following_count=0,
        created_at=profile.created_at,
    )


@router.patch("", response_model=UserProfileMeRead)
def update_profile(
    body: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = social_service.get_profile(db, current_user.id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    if body.handle and body.handle.lower() != profile.handle:
        if not social_service.is_handle_available(db, body.handle):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Handle already taken")
    updated = social_service.update_profile(db, profile, body)
    return UserProfileMeRead(
        id=updated.id,
        user_id=updated.user_id,
        handle=updated.handle,
        display_name=updated.display_name,
        bio=updated.bio,
        avatar_url=updated.avatar_url,
        top_genres=updated.top_genres or [],
        favourite_authors=updated.favourite_authors or [],
        follower_count=social_service.get_follower_count(db, current_user.id),
        following_count=social_service.get_following_count(db, current_user.id),
        created_at=updated.created_at,
    )
