"""
End-to-end happy path: register → login → create book → log book → retrieve history.
Runs against a real database (DATABASE_URL must be set in the environment).
"""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.metadata_enrichment import get_metadata_enrichment_scheduler

client = TestClient(app)


@pytest.fixture(autouse=True)
def disable_metadata_enrichment():
    app.dependency_overrides[get_metadata_enrichment_scheduler] = lambda: (
        lambda background_tasks, user_id, book_id: None
    )
    yield
    app.dependency_overrides.clear()


@pytest.fixture(scope="module")
def auth_headers():
    email = f"e2e_{uuid.uuid4().hex[:8]}@example.com"
    r = client.post("/auth/register", json={"email": email, "password": "testpass123"})
    assert r.status_code == 201, r.text

    r = client.post("/auth/login", json={"email": email, "password": "testpass123"})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_register_and_login(auth_headers):
    assert "Authorization" in auth_headers


def test_create_book(auth_headers):
    r = client.post(
        "/books",
        json={"title": "The Pragmatic Programmer", "author": "David Thomas", "page_count": 352},
        headers=auth_headers,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "The Pragmatic Programmer"
    assert data["id"]


def test_log_book_and_retrieve_history(auth_headers):
    # Create a book to log
    book = client.post(
        "/books",
        json={"title": "Clean Code", "author": "Robert Martin"},
        headers=auth_headers,
    ).json()

    # Log as currently reading
    r = client.post(
        "/reading-logs",
        json={"book_id": book["id"], "status": "reading", "start_date": "2026-05-01"},
        headers=auth_headers,
    )
    assert r.status_code == 201
    log_id = r.json()["id"]

    # Update to read with a rating
    r = client.patch(
        f"/reading-logs/{log_id}",
        json={"status": "read", "end_date": "2026-05-11", "rating": 5},
        headers=auth_headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "read"
    assert data["rating"] == 5
    assert data["pace_days"] == 10

    # Retrieve full reading history
    r = client.get("/reading-logs", headers=auth_headers)
    assert r.status_code == 200
    logs = r.json()
    assert any(log["id"] == log_id for log in logs)


def test_unauthenticated_returns_401():
    assert client.get("/books").status_code == 401
    assert client.get("/reading-logs").status_code == 401


# ---------------------------------------------------------------------------
# Multi-user ownership tests
# ---------------------------------------------------------------------------


def _register_and_login(suffix: str) -> dict:
    email = f"e2e_{suffix}_{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={"email": email, "password": "testpass123"})
    token = client.post("/auth/login", json={"email": email, "password": "testpass123"}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_duplicate_isbn_across_users():
    """Two different users can add the same ISBN — uniqueness is per-user."""
    headers_a = _register_and_login("isbn_a")
    headers_b = _register_and_login("isbn_b")
    payload = {"title": "Dune", "author": "Frank Herbert", "isbn": "9780441013593"}

    r_a = client.post("/books", json=payload, headers=headers_a)
    assert r_a.status_code == 201

    r_b = client.post("/books", json=payload, headers=headers_b)
    assert r_b.status_code == 201


def test_user_cannot_log_another_users_book():
    """User B cannot create a reading log against a book owned by User A."""
    headers_a = _register_and_login("log_owner")
    headers_b = _register_and_login("log_thief")

    book = client.post(
        "/books",
        json={"title": "User A Book", "author": "Author A"},
        headers=headers_a,
    ).json()

    r = client.post(
        "/reading-logs",
        json={"book_id": book["id"], "status": "reading"},
        headers=headers_b,
    )
    assert r.status_code == 404


def test_user_cannot_see_another_users_books():
    """User B's book list and direct GET return nothing for User A's books."""
    headers_a = _register_and_login("vis_a")
    headers_b = _register_and_login("vis_b")

    book = client.post(
        "/books",
        json={"title": "Private Book", "author": "Author A"},
        headers=headers_a,
    ).json()

    books_b = client.get("/books", headers=headers_b).json()
    assert not any(b["id"] == book["id"] for b in books_b)

    assert client.get(f"/books/{book['id']}", headers=headers_b).status_code == 404


def test_feed_returns_self_activity_without_social_profile():
    """Feed should not fail or render empty just because the user skipped profile setup."""
    headers = _register_and_login("feed_self")

    book = client.post(
        "/books",
        json={"title": "Feed Source Book", "author": "Feed Author"},
        headers=headers,
    ).json()

    r = client.post(
        "/reading-logs",
        json={"book_id": book["id"], "status": "reading"},
        headers=headers,
    )
    assert r.status_code == 201

    r = client.get("/feed", headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["items"]
    assert data["items"][0]["event_type"] == "started"
    assert data["items"][0]["book"]["title"] == "Feed Source Book"
