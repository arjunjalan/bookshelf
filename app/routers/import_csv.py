import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.import_csv import ImportSummary
from app.services import import_csv as import_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/import", tags=["import"])

_MAX_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("/csv", response_model=ImportSummary)
async def import_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be a .csv")

    content = await file.read()
    if len(content) > _MAX_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 5 MB limit")

    try:
        summary = import_service.import_goodreads_csv(db, current_user.id, content)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    logger.info(
        "CSV import for user %s: imported=%d skipped=%d errors=%d",
        current_user.id, summary.imported, summary.skipped, len(summary.errors),
    )
    return summary
