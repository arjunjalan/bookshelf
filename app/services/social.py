import uuid
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.social import Follow, UserProfile
from app.schemas.social import UserProfileCreate, UserProfileUpdate


def get_profile(db: Session, user_id: uuid.UUID) -> Optional[UserProfile]:
    return db.query(UserProfile).filter(UserProfile.user_id == user_id).first()


def get_profile_by_handle(db: Session, handle: str) -> Optional[UserProfile]:
    return db.query(UserProfile).filter(UserProfile.handle == handle.lower()).first()


def is_handle_available(db: Session, handle: str) -> bool:
    return db.query(UserProfile).filter(UserProfile.handle == handle.lower()).first() is None


def create_profile(db: Session, user_id: uuid.UUID, body: UserProfileCreate) -> UserProfile:
    profile = UserProfile(
        user_id=user_id,
        handle=body.handle.lower(),
        display_name=body.display_name,
        bio=body.bio,
        top_genres=body.top_genres or [],
        favourite_authors=body.favourite_authors or [],
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def update_profile(db: Session, profile: UserProfile, body: UserProfileUpdate) -> UserProfile:
    update_data = body.model_dump(exclude_unset=True)
    if "handle" in update_data and update_data["handle"]:
        update_data["handle"] = update_data["handle"].lower()
    for field, value in update_data.items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


def get_follower_count(db: Session, user_id: uuid.UUID) -> int:
    return db.query(func.count(Follow.follower_id)).filter(Follow.followee_id == user_id).scalar() or 0


def get_following_count(db: Session, user_id: uuid.UUID) -> int:
    return db.query(func.count(Follow.followee_id)).filter(Follow.follower_id == user_id).scalar() or 0


def is_following(db: Session, follower_id: uuid.UUID, followee_id: uuid.UUID) -> bool:
    return (
        db.query(Follow)
        .filter(Follow.follower_id == follower_id, Follow.followee_id == followee_id)
        .first()
    ) is not None


def follow(db: Session, follower_id: uuid.UUID, followee_id: uuid.UUID) -> None:
    if not is_following(db, follower_id, followee_id):
        db.add(Follow(follower_id=follower_id, followee_id=followee_id))
        db.commit()


def unfollow(db: Session, follower_id: uuid.UUID, followee_id: uuid.UUID) -> None:
    row = (
        db.query(Follow)
        .filter(Follow.follower_id == follower_id, Follow.followee_id == followee_id)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()


def search_users(db: Session, q: str, limit: int = 20) -> list[tuple[UserProfile, int]]:
    q_lower = q.lower().strip()
    profiles = (
        db.query(UserProfile)
        .filter(UserProfile.handle.ilike(f"%{q_lower}%"))
        .limit(limit)
        .all()
    )
    return [(p, get_follower_count(db, p.user_id)) for p in profiles]
