import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import date

import httpx

from app.adapters.metadata import MetadataAdapter, MetadataResult, MetadataSearchPage

logger = logging.getLogger(__name__)

_SEARCH_URL = "https://openlibrary.org/search.json"
_WORKS_URL = "https://openlibrary.org{key}.json"
_COVER_URL = "https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"

_SEARCH_FIELDS = (
    "title,author_name,key,isbn,number_of_pages_median,cover_i,first_publish_year"
)


def _fetch_description(key: str) -> str | None:
    try:
        with httpx.Client(timeout=3.0) as client:
            resp = client.get(_WORKS_URL.format(key=key))
            resp.raise_for_status()
            desc = resp.json().get("description")
            if isinstance(desc, str):
                return desc
            if isinstance(desc, dict):
                return desc.get("value")
    except Exception:
        logger.debug("Failed to fetch description for %s", key, exc_info=True)
    return None


class OpenLibraryAdapter(MetadataAdapter):
    def search(self, query: str, *, limit: int = 10, lite: bool = False) -> list[MetadataResult]:
        return self.search_page(query, limit=limit, offset=0, lite=lite).results

    def search_page(
        self,
        query: str,
        *,
        limit: int = 10,
        offset: int = 0,
        lite: bool = False,
    ) -> MetadataSearchPage:
        try:
            with httpx.Client(timeout=5.0) as client:
                response = client.get(_SEARCH_URL, params={
                    "q": query,
                    "limit": limit,
                    "offset": offset,
                    "fields": _SEARCH_FIELDS,
                })
                response.raise_for_status()
                payload = response.json()
                docs = payload.get("docs", [])
                total = _parse_total(payload, fallback=offset + len(docs))
        except Exception:
            logger.warning("Open Library search failed for query %r", query, exc_info=True)
            return MetadataSearchPage(
                results=[],
                total=0,
                offset=offset,
                limit=limit,
                has_more=False,
            )

        valid_docs = [
            doc for doc in docs
            if doc.get("title") and doc.get("author_name")
        ]

        if lite:
            descriptions = [None] * len(valid_docs)
        elif not valid_docs:
            descriptions = []
        else:
            keys = [doc.get("key") for doc in valid_docs]
            with ThreadPoolExecutor(max_workers=min(len(keys), 10)) as executor:
                descriptions = list(executor.map(
                    lambda k: _fetch_description(k) if k else None,
                    keys,
                ))

        results = []
        for doc, description in zip(valid_docs, descriptions):
            isbns = doc.get("isbn") or []
            cover_id = doc.get("cover_i")
            year = doc.get("first_publish_year")

            results.append(
                MetadataResult(
                    title=doc["title"],
                    author=doc["author_name"][0],
                    isbn=isbns[0] if isbns else None,
                    cover_url=_COVER_URL.format(cover_id=cover_id) if cover_id else None,
                    description=description,
                    page_count=doc.get("number_of_pages_median"),
                    published_date=date(year, 1, 1) if year and 1 <= year <= 9999 else None,
                )
            )
        return MetadataSearchPage(
            results=results,
            total=total,
            offset=offset,
            limit=limit,
            has_more=offset + limit < total,
        )


def _parse_total(payload: dict, *, fallback: int) -> int:
    for key in ("num_found", "numFound"):
        value = payload.get(key)
        if isinstance(value, int):
            return value
        if isinstance(value, str) and value.isdigit():
            return int(value)
    return fallback
