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
- [ ] #9 SQLAlchemy models: users, books, reading_logs, tags
- [ ] #10 Alembic migrations: initial schema
- [ ] #11 Supabase connection and environment config
- [ ] #12 JWT authentication: registration and login
- [ ] #13 CRUD endpoints: books
- [ ] #14 CRUD endpoints: reading records
- [ ] #15 End-to-end smoke test

Work top to bottom — each story depends on the one above it.

---

## Session Notes

### 2026-05-11 — Issue #8 (Scaffold)
- Scaffolded full FastAPI project layout: `app/{routers,services,adapters,models,schemas}`, `tests/`, `pyproject.toml`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `.gitignore`.
- Used **uv** as the package manager (already installed at `/home/aj/.local/bin/uv`); `uv.lock` committed for reproducible builds.
- Dockerfile uses `uv sync --frozen --no-dev` via the official uv Docker image for fast, locked installs.
- `docker-compose.yml` wires DATABASE_URL directly (no `env_file`) so the container hostname resolves to the `postgres` service; `.env` is for out-of-Docker local runs only.
- `GET /health` returns `{"status":"ok"}` — verified live.
