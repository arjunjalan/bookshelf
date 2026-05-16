import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.adapters import get_metadata_adapter
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.book import BookSearchResult

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/metadata", tags=["metadata"])


@router.get("/search", response_model=list[BookSearchResult])
def search_metadata(
    q: str = Query(...),
    limit: int = Query(10, ge=1, le=30),
    lite: bool = Query(False),
    current_user: User = Depends(get_current_user),
):
    if not q.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Query must not be empty")
    results = get_metadata_adapter().search(q, limit=limit, lite=lite)
    logger.info("Metadata search for %r returned %d results (lite=%s, user %s)", q, len(results), lite, current_user.id)
    return [
        BookSearchResult(
            title=r.title,
            author=r.author,
            isbn=r.isbn,
            cover_url=r.cover_url,
            description=r.description,
            page_count=r.page_count,
            published_date=r.published_date,
        )
        for r in results
    ]
