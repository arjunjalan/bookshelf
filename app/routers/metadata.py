import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.adapters import get_metadata_adapter
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.book import BookSearchPage, BookSearchResult

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/metadata", tags=["metadata"])


def _to_book_search_result(result) -> BookSearchResult:
    return BookSearchResult(
        title=result.title,
        author=result.author,
        isbn=result.isbn,
        cover_url=result.cover_url,
        description=result.description,
        page_count=result.page_count,
        published_date=result.published_date,
    )


@router.get("/search", response_model=list[BookSearchResult] | BookSearchPage)
def search_metadata(
    q: str = Query(...),
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    lite: bool = Query(False),
    paginated: bool = Query(False),
    current_user: User = Depends(get_current_user),
):
    if not q.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Query must not be empty")

    adapter = get_metadata_adapter()
    if paginated:
        page = adapter.search_page(q, limit=limit, offset=offset, lite=lite)
        logger.info(
            "Paginated metadata search for %r returned %d/%d results (offset=%d, limit=%d, lite=%s, user %s)",
            q,
            len(page.results),
            page.total,
            offset,
            limit,
            lite,
            current_user.id,
        )
        return BookSearchPage(
            results=[_to_book_search_result(r) for r in page.results],
            total=page.total,
            offset=page.offset,
            limit=page.limit,
            has_more=page.has_more,
        )

    results = adapter.search(q, limit=limit, lite=lite)
    logger.info("Metadata search for %r returned %d results (lite=%s, user %s)", q, len(results), lite, current_user.id)
    return [_to_book_search_result(r) for r in results]
