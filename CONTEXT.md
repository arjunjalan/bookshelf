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
- [x] #11 Supabase connection and environment config
- [x] #12 JWT authentication: registration and login
- [x] #13 CRUD endpoints: books
- [x] #14 CRUD endpoints: reading records
- [ ] #15 End-to-end smoke test

Work top to bottom — each story depends on the one above it.

---

## Session Notes

### 2026-05-11 — Issue #14 (Reading log CRUD)
- `app/schemas/reading_log.py`: ReadingLogCreate, ReadingLogRead, ReadingLogUpdate.
- `app/routers/reading_logs.py`: POST /reading-logs (201), GET /reading-logs (filterable by status), GET/PATCH /reading-logs/{id}. User isolation enforced in every query (filter by user_id == current_user.id).
- `pace_days` auto-computed on create and recomputed on every PATCH (service layer not needed here — computation is a single expression).
- Bug found and fixed: SQLAlchemy `Enum(ReadingStatus)` stores enum NAMES by default (e.g., "READING") not VALUES ("reading"). Fixed with `values_callable=lambda x: [e.value for e in x]` on the mapped column. This must be kept consistent with the PostgreSQL type's lowercase values.

### 2026-05-11 — Issue #13 (Book CRUD)
- `app/schemas/book.py`: BookCreate, BookRead, BookUpdate (all optional fields for PATCH).
- `app/routers/books.py`: POST /books (201), GET /books (paginated, skip/limit), GET/PATCH/DELETE /books/{id}. All require Bearer token.
- PATCH uses `model_dump(exclude_unset=True)` so unset fields are not overwritten.
- Books are a shared catalog (no user_id) — CLAUDE.md "users only access their own data" applies to reading logs, not the book catalog.

### 2026-05-11 — Issue #12 (JWT auth)
- `app/schemas/user.py`: UserCreate, UserRead, LoginRequest, Token schemas.
- `app/services/auth.py`: bcrypt password hashing + JWT creation/decode (python-jose HS256).
- `app/dependencies.py`: `get_current_user` FastAPI dependency using OAuth2PasswordBearer.
- `app/routers/auth.py`: POST /auth/register (201, 409 on duplicate), POST /auth/login (200 token, 401 on bad creds).
- Dropped `passlib[bcrypt]` — unmaintained and broken with bcrypt >= 4.x (detect_wrap_bug ValueError). Using `bcrypt` directly instead.
- `pydantic[email]` added for EmailStr (forgot in original deps).
- Token expiry defaults to 1440 minutes (24h), configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`.
- Lazy engine init in `database.py` fixed module-level import ordering (load_dotenv must run before DATABASE_URL is read).

### 2026-05-11 — Issue #11 (DB connection config)
- `app/database.py`: sync SQLAlchemy engine (psycopg2) + `SessionLocal` + `get_db()` FastAPI dependency.
- Pool tuned for Supabase free tier: pool_size=5, max_overflow=10, pool_recycle=1800, pool_pre_ping=True.
- Startup event in `main.py` runs `SELECT 1` to confirm DB is reachable on boot.
- `.env.example` updated with Supabase pooler URL format (use port 6543 for serverless, 5432 for Render).
- Supabase project provisioning is a manual step — user needs to set DATABASE_URL in `.env` / Render env vars.

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
