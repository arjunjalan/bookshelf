from datetime import date
from types import SimpleNamespace
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from app.adapters.metadata import MetadataResult
from app.database import get_session_factory
from app.main import app
from app.models.book import Book
from app.services.metadata_enrichment import enrich_book_metadata, get_metadata_enrichment_scheduler
from scripts import backfill_metadata as backfill_script

client = TestClient(app)


class FakeMetadataAdapter:
    def __init__(self, results: list[MetadataResult]):
        self.results = results
        self.calls = []

    def search(self, query: str, *, limit: int = 10, lite: bool = False) -> list[MetadataResult]:
        self.calls.append({"query": query, "limit": limit, "lite": lite})
        return self.results

    def search_page(self, query: str, *, limit: int = 10, offset: int = 0, lite: bool = False):
        raise NotImplementedError


def _auth_headers() -> dict[str, str]:
    email = f"enrich_{uuid4().hex[:8]}@example.com"
    response = client.post("/auth/register", json={"email": email, "password": "testpass123"})
    assert response.status_code == 201, response.text
    response = client.post("/auth/login", json={"email": email, "password": "testpass123"})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _no_op_scheduler():
    return lambda background_tasks, user_id, book_id: None


def test_enrich_book_metadata_fills_missing_fields_without_overwriting_existing_values():
    app.dependency_overrides[get_metadata_enrichment_scheduler] = _no_op_scheduler
    try:
        headers = _auth_headers()
        response = client.post(
            "/books",
            json={
                "title": "Dune",
                "author": "Frank Herbert",
                "isbn": "9780441013593",
                "page_count": 412,
            },
            headers=headers,
        )
        assert response.status_code == 201, response.text
        book_id = UUID(response.json()["id"])
        user_id = UUID(response.json()["user_id"])
    finally:
        app.dependency_overrides.clear()

    adapter = FakeMetadataAdapter([
        MetadataResult(
            title="Dune",
            author="Frank Herbert",
            isbn="9780441013593",
            cover_url="https://covers.example/dune.jpg",
            description="A desert planet epic.",
            page_count=999,
            published_date=date(1965, 1, 1),
        )
    ])

    db = get_session_factory()()
    try:
        book = enrich_book_metadata(db, user_id, book_id, adapter)
        assert book is not None
        assert book.cover_url == "https://covers.example/dune.jpg"
        assert book.description == "A desert planet epic."
        assert book.page_count == 412
        assert book.published_date == date(1965, 1, 1)
    finally:
        db.close()

    assert adapter.calls[0] == {"query": "9780441013593", "limit": 5, "lite": False}


def test_create_book_schedules_metadata_enrichment():
    scheduled = []

    def capture_scheduler():
        def schedule(background_tasks, user_id, book_id):
            scheduled.append(SimpleNamespace(user_id=user_id, book_id=book_id))

        return schedule

    app.dependency_overrides[get_metadata_enrichment_scheduler] = capture_scheduler
    try:
        headers = _auth_headers()
        response = client.post(
            "/books",
            json={"title": "Station Eleven", "author": "Emily St. John Mandel"},
            headers=headers,
        )
        assert response.status_code == 201, response.text
    finally:
        app.dependency_overrides.clear()

    assert len(scheduled) == 1
    assert str(scheduled[0].book_id) == response.json()["id"]
    assert str(scheduled[0].user_id) == response.json()["user_id"]


def test_goodreads_import_schedules_new_books_for_metadata_enrichment():
    scheduled = []

    def capture_scheduler():
        def schedule(background_tasks, user_id, book_id):
            scheduled.append(SimpleNamespace(user_id=user_id, book_id=book_id))

        return schedule

    csv_content = "\n".join([
        (
            "Book Id,Title,Author,ISBN,ISBN13,My Rating,Average Rating,Publisher,Binding,"
            "Number of Pages,Year Published,Original Publication Year,Date Read,Date Added,"
            "Bookshelves,Bookshelves with positions,Exclusive Shelf,My Review"
        ),
        '1,Dune,Frank Herbert,="0441013597",="9780441013593",5,4.3,Ace,Paperback,412,1990,1965,2026/05/10,2026/05/01,,,read,Great',
        '2,Station Eleven,Emily St. John Mandel,="",="",0,4.1,Knopf,Hardcover,333,2014,2014,,2026/05/01,,,to-read,',
    ])

    app.dependency_overrides[get_metadata_enrichment_scheduler] = capture_scheduler
    try:
        headers = _auth_headers()
        response = client.post(
            "/import/csv",
            files={"file": ("goodreads.csv", csv_content.encode("utf-8"), "text/csv")},
            headers=headers,
        )
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.clear()

    assert response.json()["imported"] == 2
    assert len(scheduled) == 2

    db = get_session_factory()()
    try:
        scheduled_ids = [item.book_id for item in scheduled]
        imported_ids = {book.id for book in db.query(Book).filter(Book.id.in_(scheduled_ids)).all()}
    finally:
        db.close()

    assert imported_ids == {item.book_id for item in scheduled}


def test_backfill_metadata_targets_existing_books_missing_core_metadata(monkeypatch):
    user_email = f"backfill_{uuid4().hex[:8]}@example.com"
    register = client.post("/auth/register", json={"email": user_email, "password": "testpass123"})
    assert register.status_code == 201, register.text
    login = client.post("/auth/login", json={"email": user_email, "password": "testpass123"})
    assert login.status_code == 200, login.text
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    app.dependency_overrides[get_metadata_enrichment_scheduler] = _no_op_scheduler
    try:
        missing = client.post(
            "/books",
            json={"title": "Missing Metadata", "author": "Author A"},
            headers=headers,
        ).json()
        complete = client.post(
            "/books",
            json={
                "title": "Complete Metadata",
                "author": "Author B",
                "cover_url": "https://covers.example/complete.jpg",
                "description": "Already complete.",
            },
            headers=headers,
        ).json()
    finally:
        app.dependency_overrides.clear()

    touched = []

    def fake_enrich(db, user_id, book_id):
        book = db.query(Book).filter(Book.id == book_id, Book.user_id == user_id).first()
        touched.append(book.id)
        book.description = "Backfilled."
        db.commit()
        db.refresh(book)
        return book

    monkeypatch.setattr(backfill_script, "enrich_book_metadata", fake_enrich)

    db = get_session_factory()()
    try:
        summary = backfill_script.backfill_metadata(db, email=user_email, limit=10)
    finally:
        db.close()

    assert summary.considered == 1
    assert summary.updated == 1
    assert str(touched[0]) == missing["id"]
    assert str(touched[0]) != complete["id"]
