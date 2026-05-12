"""
End-to-end happy path: register → login → create book → log book → retrieve history.
Runs against a real database (DATABASE_URL must be set in the environment).
"""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


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
