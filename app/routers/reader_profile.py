import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.reader_profile import ReaderProfile
from app.services import reader_profile as reader_profile_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reader-profile", tags=["reader-profile"])


@router.get("", response_model=ReaderProfile)
def get_reader_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info("Reader profile requested for user %s", current_user.id)
    result = reader_profile_service.get_reader_profile(db, current_user.id)
    return ReaderProfile(**result)
