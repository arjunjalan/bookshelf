import logging
from datetime import date

import httpx

from app.adapters.metadata import MetadataAdapter, MetadataResult

logger = logging.getLogger(__name__)

_BASE_URL = "https://openlibrary.org/search.json"
_COVER_URL = "https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"


class OpenLibraryAdapter(MetadataAdapter):
    def search(self, query: str) -> list[MetadataResult]:
        try:
            with httpx.Client(timeout=5.0) as client:
                response = client.get(_BASE_URL, params={
                    "q": query,
                    "limit": 10,
                    "fields": "title,author_name,isbn,number_of_pages_median,cover_i,first_publish_year",
                })
                response.raise_for_status()
                docs = response.json().get("docs", [])
        except Exception:
            logger.warning("Open Library search failed for query %r", query, exc_info=True)
            return []

        results = []
        for doc in docs:
            title = doc.get("title")
            authors = doc.get("author_name") or []
            if not title or not authors:
                continue

            isbns = doc.get("isbn") or []
            cover_id = doc.get("cover_i")
            year = doc.get("first_publish_year")

            results.append(
                MetadataResult(
                    title=title,
                    author=authors[0],
                    isbn=isbns[0] if isbns else None,
                    cover_url=_COVER_URL.format(cover_id=cover_id) if cover_id else None,
                    description=None,
                    page_count=doc.get("number_of_pages_median"),
                    published_date=date(year, 1, 1) if year and 1 <= year <= 9999 else None,
                )
            )
        return results
