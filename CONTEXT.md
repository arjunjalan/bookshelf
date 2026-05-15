# CONTEXT.md

Working state for the current build session. Updated by the agent at the end of every session. Read this alongside `CLAUDE.md`.

---

## Current Phase

**Phase 4 — Reading Analytics**

Phases 1, 2, and 3 are complete and closed.

---

## Phase 4 — In Progress

- [x] #46 Phase 4.1 — Analytics data layer (merged PR #49)
- [x] #47 Phase 4.2 — Analytics API endpoints (merged PR #49)
- [x] #48 Phase 4.3 — Analytics dashboard frontend (merged PR #50)

---

## Phase 3 — Complete

- [x] #32 Phase 3.1 — MetadataAdapter protocol + OpenLibraryAdapter
- [x] #33 Phase 3.2 — GET /metadata/search endpoint (JWT-protected)
- [x] #34 Phase 3.3 — Display enriched metadata fields in BookDetail
- [x] #35 Phase 3.4 — Search-and-select add-book flow
- [x] #28 Phase 3.X — E2E smoke tests with Playwright
- [x] PR #37 Phase 3 feature branch merged
- [x] PR #41 fix: request isbn and page count fields explicitly from Open Library
- [x] PR #42 fix: populate description from Open Library first_sentence (superseded by #43)
- [x] PR #43 fix: fetch descriptions from Open Library Works API concurrently
- [x] PR #44 fix: add --build to start.sh; cache npm deps and Playwright browsers in CI

---

## Phase 2 — Complete

- [x] #18 Phase 2.1 — Scaffold React frontend (Vite + Tailwind v3 + React Router v6 + TanStack Query v5 + Axios)
- [x] #19 Phase 2.2 — Auth context and JWT token handling
- [x] #20 Phase 2.3 — Register and Login pages
- [x] #21 Phase 2.4 — App shell and navigation
- [x] #22 Phase 2.5 — Reading list page
- [x] #23 Phase 2.6 — Add book form
- [x] #24 Phase 2.7 — Book detail page
- [x] PR #27 Backend gaps for frontend (nested BookSummary in ReadingLogRead, DELETE /reading-logs/{id})
- [x] PR #29 Phase 2 frontend merged to main; CORS middleware and SECRET_KEY dev default added

---

## Phase 1 — Complete

- [x] #8 Scaffold FastAPI project and Docker Compose
- [x] #9 SQLAlchemy models: users, books, reading_logs, tags
- [x] #10 Alembic migrations: initial schema
- [x] #11 Supabase connection and environment config
- [x] #12 JWT authentication: registration and login
- [x] #13 CRUD endpoints: books
- [x] #14 CRUD endpoints: reading records
- [x] #15 End-to-end smoke test
- [x] PR #16 Books made user-scoped (user_id FK, ownership enforced in all queries)
- [x] PR #17 Codex review fixes (import ordering, lazy SECRET_KEY, book ownership on log create, composite ISBN uniqueness, multi-user tests)

---

## Session Notes

### 2026-05-15 — Phase 3 complete (PRs #37, #41, #43, #44)
- `app/adapters/metadata.py`: `MetadataAdapter` ABC + `MetadataResult` dataclass.
- `app/adapters/open_library.py`: `OpenLibraryAdapter` — searches Open Library, fetches descriptions concurrently from Works API via `ThreadPoolExecutor` (bounded latency), requests `isbn` and `number_of_pages_median` explicitly via `fields` param.
- `app/routers/metadata.py`: `GET /metadata/search?q=` — JWT-protected, returns `list[BookSearchResult]`.
- `frontend/src/pages/AddBook.jsx`: full rewrite — search-and-select flow with cover thumbnail results list, confirm/pre-fill form, manual fallback.
- `frontend/src/pages/BookDetail.jsx`: surfaces description, page count, published year; `htmlFor`/`id` pairs added to all labels for Playwright compatibility.
- `frontend/src/pages/Register.jsx`, `Login.jsx`: `htmlFor`/`id` pairs added.
- `scripts/start.sh`: `docker compose up -d --build` ensures container rebuilds after `git pull`.
- `.github/workflows/e2e.yml`: two Playwright smoke tests (add-book, book-detail); npm and Playwright browser caching added.

### 2026-05-15 — Codex review fixes (PR #30)
- `frontend/src/pages/BookDetail.jsx`: "Remove from shelf" now calls `DELETE /books/{id}` instead of `DELETE /reading-logs/{id}`; cascade removes the log, eliminating the orphaned book record.
- `app/routers/books.py`: `IntegrityError` caught in `create_book` and `update_book`; returns 409 instead of 500 on duplicate `(user_id, isbn)`.
- `frontend/src/api/client.js`: response interceptor added — any 401 clears `bs_token`/`bs_user` from localStorage and hard-redirects to `/login`.
- `AGENTS.md` synced with `CLAUDE.md` (Phase 2 additions); `REVIEW.md` updated with findings #1–3 struck through. Findings #4 and #5 deferred.

### 2026-05-15 — Phase 2 complete (PR #29)
- Full React frontend built and tested locally end-to-end.
- `frontend/`: Vite + React + Tailwind v3 + React Router v6 + TanStack Query v5 + Axios.
- `src/contexts/AuthContext.jsx`: JWT stored in localStorage as `bs_token`; axios interceptor attaches Bearer header.
- `src/components/ProtectedRoute.jsx`: redirects unauthenticated users to `/login`.
- `src/components/Layout.jsx`: responsive top nav with hamburger at `sm` breakpoint.
- Pages: Login, Register, Books (tabs + skeleton + empty state), AddBook (two-step POST /books → POST /reading-logs), BookDetail (inline edit via PATCH, remove via DELETE).
- Backend fixes landed alongside: CORS middleware in `app/main.py` (configurable via `CORS_ORIGINS` env var, defaults to `http://localhost:5173`); `SECRET_KEY` dev default in `docker-compose.yml`.
- Issue #25 (Vercel deployment) deferred — will reopen for Phase 2.8 once a Render backend URL exists.
- All 15 manual acceptance criteria passed before PR was opened.

### 2026-05-15 — Phase 1 closed; README and CONTEXT updated
- README.md written as a public-facing project page: stack, structure, getting started, API overview, roadmap.
- CONTEXT.md updated to reflect Phase 1 complete and Phase 2 as current phase.
- Worktree practice now documented in CLAUDE.md and followed from this session forward.

### 2026-05-15 — Codex review fixes (PR #17)
- `app/main.py`: `load_dotenv()` moved before router imports.
- `app/services/auth.py`: `SECRET_KEY` and token expiry read lazily at call time (no module-level `os.environ[]`).
- `app/services/reading_logs.py`: `create_reading_log` now verifies `book.user_id == user_id` before inserting; returns `None` on mismatch → 404 in router.
- `alembic/versions/0003_books_user_id.py`: added `DEV-ONLY` comment on data-clearing statements.
- `alembic/versions/0004_books_isbn_composite_unique.py`: drops global `ix_books_isbn`; adds `uq_books_user_isbn (user_id, isbn) WHERE isbn IS NOT NULL`.
- `app/models/book.py`: `__table_args__` composite index to match migration 0004.
- `tests/test_e2e.py`: 3 new multi-user tests — duplicate ISBN, cross-user log creation blocked, cross-user book visibility blocked. 7/7 passing.

### 2026-05-15 — Architecture review: books become user-scoped
- `app/models/book.py`: added `user_id` FK to `users` with `ondelete="CASCADE"` and index.
- `app/schemas/book.py`: `BookRead` now includes `user_id`. Added missing `Optional` import to `user.py`.
- `app/routers/books.py`: all endpoints (list, get, patch, delete) now filter by `current_user.id`. `create_book` sets `user_id=current_user.id`. Books are no longer a shared catalog.
- `alembic/versions/0003_books_user_id.py`: migration adds `user_id NOT NULL` to `books`, preceded by `DELETE FROM reading_logs / books` to clear dev data that can't be backfilled.
- `Dockerfile`: added `ENV PATH="/app/.venv/bin:$PATH"` so venv binaries (alembic, etc.) resolve without the full path.
- Docker: `newgrp docker` fixes the permission-denied error for the current terminal session. `docker compose exec api sh -c 'alembic upgrade head'` is the correct invocation (bare `alembic` fails without the `sh -c` wrapper).
- Full down/up/migrate cycle verified clean from a fresh volume.

### 2026-05-11 — Issue #15 (E2E smoke test)
- `tests/test_e2e.py`: 4 tests covering register, login, create book, log book, update to read (verifies pace_days), retrieve history, unauthenticated 401. Uses FastAPI TestClient against real DB.
- `.github/workflows/ci.yml`: push-to-main CI using astral-sh/setup-uv, starts postgres via docker compose, waits for pg_isready, runs alembic upgrade head, then pytest.
- Fixed `@app.on_event("startup")` deprecation — migrated to `lifespan` context manager (FastAPI 0.103+ pattern).
- Phase 1 is complete.

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
