from datetime import date
from types import SimpleNamespace
from uuid import uuid4

from fastapi.testclient import TestClient

from app.adapters.metadata import MetadataResult, MetadataSearchPage
from app.dependencies import get_current_user
from app.main import app
from app.routers import metadata

client = TestClient(app)


def _result(index: int) -> MetadataResult:
    return MetadataResult(
        title=f"Book {index}",
        author=f"Author {index}",
        isbn=f"97800000000{index}",
        cover_url=None,
        description=f"Description {index}",
        page_count=100 + index,
        published_date=date(2026, 1, 1),
    )


class FakeMetadataAdapter:
    def __init__(self):
        self.search_calls = []
        self.page_calls = []

    def search(self, query: str, *, limit: int = 10, lite: bool = False) -> list[MetadataResult]:
        self.search_calls.append({"query": query, "limit": limit, "lite": lite})
        return [_result(1), _result(2)]

    def search_page(
        self,
        query: str,
        *,
        limit: int = 10,
        offset: int = 0,
        lite: bool = False,
    ) -> MetadataSearchPage:
        self.page_calls.append({"query": query, "limit": limit, "offset": offset, "lite": lite})
        results = [_result(offset + 1), _result(offset + 2)]
        return MetadataSearchPage(
            results=results,
            total=5,
            offset=offset,
            limit=limit,
            has_more=offset + limit < 5,
        )


def _override_user():
    return SimpleNamespace(id=uuid4())


def _install_overrides(monkeypatch):
    adapter = FakeMetadataAdapter()
    app.dependency_overrides[get_current_user] = _override_user
    monkeypatch.setattr(metadata, "get_metadata_adapter", lambda: adapter)
    return adapter


def test_metadata_search_default_response_stays_plain_list(monkeypatch):
    adapter = _install_overrides(monkeypatch)
    try:
        response = client.get("/metadata/search", params={"q": "Dune", "limit": 25, "offset": 25})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert data[0]["title"] == "Book 1"
    assert adapter.search_calls == [{"query": "Dune", "limit": 25, "lite": False}]


def test_metadata_search_paginated_response_includes_page_metadata(monkeypatch):
    adapter = _install_overrides(monkeypatch)
    try:
        response = client.get(
            "/metadata/search",
            params={"q": "Dune", "limit": 2, "offset": 2, "paginated": "true"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 5
    assert data["offset"] == 2
    assert data["limit"] == 2
    assert data["has_more"] is True
    assert [book["title"] for book in data["results"]] == ["Book 3", "Book 4"]
    assert adapter.page_calls == [{"query": "Dune", "limit": 2, "offset": 2, "lite": False}]


def test_metadata_search_limit_above_50_is_rejected(monkeypatch):
    _install_overrides(monkeypatch)
    try:
        response = client.get("/metadata/search", params={"q": "Dune", "limit": 51})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 422
