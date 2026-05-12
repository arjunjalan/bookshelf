# CONTEXT.md

Working state for the current build session. Updated by the agent at the end of every session. Read this alongside `CLAUDE.md`.

---

## Current Phase

**Phase 1 — Core Data Model**
A stable backend that can store books and reading records.
Done when: an authenticated user can log a book and retrieve their reading history via the API.

---

## Stories

- [x] #8 Scaffold FastAPI project and Docker Compose
- [x] #9 SQLAlchemy models: users, books, reading_logs, tags
- [x] #10 Alembic migrations: initial schema
- [ ] #11 Supabase connection and environment config
- [ ] #12 JWT authentication: registration and login
- [ ] #13 CRUD endpoints: books
- [ ] #14 CRUD endpoints: reading records
- [ ] #15 End-to-end smoke test

Work top to bottom — each story depends on the one above it.

---

## Session Notes

### 2026-05-11 — Issue #10 (Alembic migrations)
- Alembic initialized; `env.py` pulls `DATABASE_URL` from env via `python-dotenv` and targets `Base.metadata`.
- `alembic.ini` no longer hardcodes a URL.
- Initial migration written manually (no live DB at init time); uses `op.execute("CREATE TYPE ...")` for the `readingstatus` enum because `sa.Enum(create_type=False)` is silently ignored in SQLAlchemy 2.0.49 — only `postgresql.ENUM(create_type=False)` respects that flag. Enum column in the migration uses `postgresql.ENUM(..., create_type=False)` to avoid double-creation.
- `alembic upgrade head` creates all 5 tables; `downgrade -1` drops them cleanly. Verified live against postgres:16-alpine via Docker (accessed via `sg docker`).
- Docker socket requires `sg docker -c "..."` in non-interactive shells; user's session doesn't have the docker group active. To fix permanently: `newgrp docker` in a new terminal or re-login.

### 2026-05-11 — Issue #9 (SQLAlchemy models)
- Four models: User, Book, ReadingLog, Tag; association table reading_log_tags.
- SQLAlchemy 2.0 declarative style with `Mapped`/`mapped_column`.
- UUID PKs throughout (PostgreSQL `UUID(as_uuid=True)`).
- `ReadingStatus` is a `str, enum.Enum` (values: read/reading/want_to_read) — JSON-serializable for Pydantic.
- `pace_days` stored as plain Integer column; service layer will compute and persist it (not a DB computed column — simpler and analytics-friendly).
- All relationships verified in Python shell (5 tables registered in metadata).

### 2026-05-11 — Issue #8 (Scaffold)
- Scaffolded full FastAPI project layout: `app/{routers,services,adapters,models,schemas}`, `tests/`, `pyproject.toml`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `.gitignore`.
- Used **uv** as the package manager (already installed at `/home/aj/.local/bin/uv`); `uv.lock` committed for reproducible builds.
- Dockerfile uses `uv sync --frozen --no-dev` via the official uv Docker image for fast, locked installs.
- `docker-compose.yml` wires DATABASE_URL directly (no `env_file`) so the container hostname resolves to the `postgres` service; `.env` is for out-of-Docker local runs only.
- `GET /health` returns `{"status":"ok"}` — verified live.
