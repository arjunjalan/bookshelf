# CONTEXT.md

Working state for the current build session. Updated by the agent at the end of every session. Read this alongside `CLAUDE.md`.

---

## Current Phase

**Phase 7 — User Feedback and Iteration**

Phases 1, 2, 3, 4, 5, and 6 are complete and closed.

---

## Phase 7 — In Progress

- [x] #74 Phase 7.3 — Typeahead book search (merged PR #77)
- [x] #78 Typeahead UX improvements — lite mode + full results list (merged PR #79)
- [x] #80 Full search pagination — useInfiniteQuery + Load more (merged PR #80, Codex)
- [x] #72 Phase 7.1 — Bulk CSV book import (merged PR #81)
- [x] #82 Chat reading list context fix — inject read books into system prompt (PR #83 + direct commits)
- [x] #73 Phase 7.2 — Chat history persistence (merged PR #84)
- [ ] #75 Phase 7.4 — Frontend redesign
- [ ] #76 Phase 7.5 — Social friends layer
- [ ] Epic #71 open

---

## Phase 6 — Complete

- [x] #54 Phase 6.1 — LLMAdapter: protocol + OpenRouter implementation (merged PR #58)
- [x] #55 Phase 6.2 — /chat API endpoint with reader profile context injection (merged PR #58)
- [x] #56 Phase 6.3 — Chat UI (merged PR #58, #59, #62)
- [x] #60 Phase 6.4 — Streaming chat responses SSE (merged PR #61)
- [x] Epic #6 closed

---

## Phase 5 — Complete

- [x] #52 Phase 5.1 — Preference signals data layer (merged PR #57)
- [x] #53 Phase 5.2 — /reader-profile API endpoint (merged PR #57)
- [x] Epic #5 closed

---

## Phase 4 — Complete

- [x] #46 Phase 4.1 — Analytics data layer (merged PR #49)
- [x] #47 Phase 4.2 — Analytics API endpoints (merged PR #49)
- [x] #48 Phase 4.3 — Analytics dashboard frontend (merged PR #50)
- [x] Epic #4 closed

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

### 2026-05-16 — Chat window wipe fix (PR #85)
- `frontend/src/pages/Chat.jsx`: awaiting `queryClient.invalidateQueries` for `chat-messages` before calling `setLiveMessages([])` — previously the clear fired before the refetch resolved, leaving `sessionMessages=[]` and `liveMessages=[]` simultaneously and blanking the window.

### 2026-05-16 — Phase 7.2 — Chat history persistence (PR #84, closes #73)
- `app/models/chat.py`: `ChatSession` (id, user_id, title, created_at, updated_at) + `ChatMessage` (id, session_id, role enum, content, created_at) ORM models. `MessageRole` is a `str, enum.Enum` with values `user`/`assistant`.
- `app/models/user.py`: `chat_sessions` relationship added (`cascade="all, delete-orphan"`).
- `alembic/versions/0008_chat_sessions.py`: creates `messagerole` enum, `chat_sessions` table (indexed on `user_id`), `chat_messages` table (indexed on `session_id`). Both cascade-delete on parent removal.
- `app/services/chat_sessions.py`: `list_sessions` (ordered by `updated_at DESC`), `create_session` (enforces 5-session cap — evicts oldest first), `get_or_create_session`, `get_messages` (last 50, returned in chronological order), `messages_as_history`, `add_turn` (saves user+assistant rows, issues explicit `UPDATE ... SET updated_at = NOW()` — ORM `onupdate` only fires on direct attribute mutation, not child inserts).
- `app/routers/chat.py`: two new GET endpoints (`/chat/sessions`, `/chat/sessions/{id}/messages`); `POST /chat` now accepts `session_id`, loads DB history as LLM context, and emits `session_id` in every SSE chunk so the frontend captures new session IDs without an extra roundtrip. Turn saved inside generator closure after `[DONE]`.
- `app/schemas/chat.py`: `session_id: UUID | None` added to `ChatRequest`; dead `history` field removed; `ChatSessionRead` and `ChatMessageRead` added.
- `frontend/src/pages/Chat.jsx`: full rewrite with left sidebar (52 w, session list + "+ New chat" button). Key patterns: `effectiveSessionId = activeSessionId ?? sessions[0]?.id ?? null` avoids `setState-in-effect`; `liveMessages` holds in-flight streaming state only; `displayMessages = useMemo(() => [...sessionMessages, ...liveMessages])` layers them. `resolvedSessionIdRef` tracks the actual session ID through the streaming closure so post-stream cache invalidation uses the correct key even when a new session was created mid-stream.

### 2026-05-16 — Chat context fixes (PRs #83 + direct commits, closes #82)
- `app/services/chat.py`: `_format_books()` added — queries `reading_logs` joined with `books`, filtered to `status == READ` only (want-to-read excluded to avoid token bloat from large Goodreads imports), ordered by `end_date` descending. Each entry formatted as `- Title by Author (read, finished YYYY-MM-DD, rated N/5)`.
- System prompt extended with full read-books list alongside existing aggregated stats.
- Prompt instruction added: only recommend real, published, well-known books — never invent titles or authors.
- `LLM_MODEL` in `.env` back on `openrouter/free` (auto-router) after `llama-3.3-70b` and `gemma-3-27b` hit free-tier rate limits.

### 2026-05-16 — Phase 7.1 — Bulk CSV book import (PR #81, closes #72)
- `app/schemas/import_csv.py`: `ImportRowError` + `ImportSummary` Pydantic schemas.
- `app/services/import_csv.py`: Goodreads CSV parser — detects format via `{"Book Id", "Exclusive Shelf"}` header check; strips `="..."` ISBN encoding; maps shelf to `ReadingStatus`; deduplicates by ISBN first, then `(title, author)` for ISBN-less books; per-row `db.commit()` via ORM relationship (no `flush()`); returns `ImportSummary`.
- `app/routers/import_csv.py`: `POST /import/csv` — `UploadFile`, 5 MB limit, `.csv` extension check, `ValueError` → 422.
- `pyproject.toml`: `python-multipart>=0.0.9` added (required for FastAPI `UploadFile`; missing caused CI failure).
- `frontend/src/pages/ImportCSV.jsx`: file picker dropzone, `useMutation` with `FormData`, summary stat cards (green/amber/red), error table with row numbers, step-by-step Goodreads export instructions. `summary` sourced from `mutation.data` (not useState). Invalidates `['reading-logs']` and `['analytics']` on successful import.
- Nav link added to desktop + mobile in `Layout.jsx`; `/import` route added to `App.jsx`.

### 2026-05-16 — Full search pagination
- Branch/worktree: `fix/full-search-pagination` in `/home/aj/projects/bookshelf-full-search-pagination`.
- `GET /metadata/search` keeps the default list response, adds `offset`, raises `limit` max to 50, and supports `paginated=true` with `{ results, total, offset, limit, has_more }`.
- `OpenLibraryAdapter.search_page()` passes Open Library `limit`/`offset` and reads `num_found`/`numFound` defensively.
- `frontend/src/pages/AddBook.jsx`: full Search now uses `useInfiniteQuery` and a `Load more` button; typeahead remains `lite=true` and capped to 10 visible dropdown results.
- Verification: `uv run pytest tests/test_metadata.py`, `npm run lint`, `npm run build`.

### 2026-05-16 — Typeahead UX improvements (PR #79, closes #78)
- `GET /metadata/search` gains `?lite=bool` and `?limit=int` (max 30) params.
- `OpenLibraryAdapter.search()` skips Works API description fan-out when `lite=True` — 2–4× faster typeahead responses.
- Frontend: typeahead uses `?lite=true`; Search button fires a separate full query (`?limit=25`) and renders a scrollable results list below the card with result count header. Typing again clears the full list and resumes typeahead.

### 2026-05-16 — Phase 7.3 — Typeahead book search (PR #77, closes #74)
- `frontend/src/hooks/useDebounce.js`: new 8-line hook, `useEffect` + `setTimeout`, no new npm deps.
- `frontend/src/pages/AddBook.jsx`: replaced submit-to-search flow with live typeahead dropdown. `committedQuery` pattern lets Search button bypass 300ms debounce for immediate fetch. `dropdownDismissed` flag (avoids `setState-in-effect` lint error). `onMouseDown` + `e.preventDefault()` on result buttons prevents blur-before-select race. `dropdownVisible` gated on both raw `query` and debounced `effectiveQuery` to avoid ghost dropdown when input is cleared. TanStack Query `staleTime: 30s` caches results per query string.

### 2026-05-16 — Pre-phase-7 review fixes (PR #70, closes #63–#69)
- **#63/#69 — SSE streaming chat**: `POST /chat` returns `StreamingResponse`; DB session materialised before generator via `build_messages()`; `get_chat_stream()` receives `messages` list only. Frontend uses `fetch()` + `ReadableStream`; `useRef` for streaming content accumulation; `clearAuthAndRedirect()` called on 401.
- **#64 — server-side validation**: `end_date >= start_date` validator on `ReadingLogCreate`/`ReadingLogUpdate`; `title`/`author` `min_length=1` and `page_count >= 1` on `BookCreate`/`BookUpdate`.
- **#65 — POST /chat request bounds**: `ChatRequest` message `max_length=2000`, history `max_length=50`, `ChatMessage` content `max_length=4000`.
- **#66 — BookDetail book_id query**: `GET /reading-logs?book_id=<uuid>` added to router and service; `BookDetail` queries with `book_id` directly and uses `logs?.[0]` instead of client-side `.find()`.
- **#67 — OpenRouter model default**: Default switched to `openrouter/free`; `max_tokens=1024` cap on both `chat()` and `chat_stream()`.
- **#68 — CI frontend lint**: `lint-frontend` job added to `ci.yml` using Node 20, `npm ci`, `npm run lint`.
- **Migration 0007**: `CHECK (pace_days IS NULL OR pace_days >= 0)`.
- Worktree `bookshelf-pre-phase7` removed; issues #63–#69 closed.

### 2026-05-16 — Phase 6 post-merge fixes (PRs #59, #61, #62)
- PR #59: `react-markdown` + `@tailwindcss/typography` added; assistant bubbles render formatted markdown.
- PR #61: Streaming SSE — `POST /chat` returns `StreamingResponse`; frontend uses `fetch()` + `ReadableStream`; tokens stream into bubble in real time; "Thinking…" pulse on empty bubble; input locked during stream.
- PR #62: Comprehensive markdown rendering fixes — `remark-gfm` for tables/strikethrough; `max-w` conflict fix (outer `max-w-[80%]` + inner `max-w-none`); `overflow-x-auto` for wide tables; links open in new tab.
- Model: switched from `meta-llama/llama-3.1-8b-instruct:free` (removed) → `google/gemma-4-31b-it:free` (rate-limited) → `openrouter/free` (auto-router, free models only). `openrouter/auto` briefly used in error — routes to paid models.
- System prompt tuned twice: "3-5 sentences" was too terse; settled on "short paragraph or 2-4 item list with one sentence of reasoning per item."

### 2026-05-16 — Phase 6 complete (PR #58)
- `app/adapters/llm.py`: `LLMAdapter` ABC + `LLMResult` dataclass.
- `app/adapters/open_router.py`: `OpenRouterAdapter` — OpenAI SDK with `base_url="https://openrouter.ai/api/v1"`. Model set via `LLM_MODEL` env var (default: `meta-llama/llama-3.1-8b-instruct:free`). Guards against empty choices/content. Lazy import via factory.
- `app/adapters/__init__.py`: extended with `get_llm_adapter()` factory (lazy imports, `LLM_PROVIDER` env var).
- `app/schemas/chat.py`: `ChatMessage` (`role: Literal["user","assistant"]`), `ChatRequest` (message + history), `ChatResponse` (reply).
- `app/services/chat.py`: `get_chat_response()` — fetches reader profile, formats as natural language system prompt, prepends history, calls LLM adapter.
- `app/routers/chat.py`: `POST /chat` — JWT-protected, injects `get_llm_adapter` via `Depends`; 503 on LLM failure.
- `app/main.py`: chat router registered.
- `frontend/src/pages/Chat.jsx`: multi-turn chat UI — suggestion chips (auto-send), animate-pulse "Thinking…" bubble, message history, error recovery (snapshot/restore on failure), auto-scroll.
- `frontend/src/App.jsx` + `frontend/src/components/Layout.jsx`: Chat route + nav link added.
- `docker-compose.yml` + `.env.example`: `OPENROUTER_API_KEY`, `LLM_PROVIDER`, `LLM_MODEL` env vars documented.
- `.github/workflows/e2e.yml`: `prune-cache: false` on setup-uv to fix post-job uv cache prune failure (uv 0.11.14 exit code 2).
- Rebuilt Docker image post-merge (`./scripts/start.sh --build`) — `openai` package now baked in.

### 2026-05-16 — Phase 5 complete (PR #57)
- `alembic/versions/0006_reader_profile_views.py`: three regular PostgreSQL views — `v_genre_affinity` (genre + books_read + avg_rating), `v_author_affinity` (author + books_read + avg_rating), `v_pace_by_genre` (genre + avg_days). All per-user via `user_id` in SELECT; `AVG()` returns null for genres/authors with no ratings (correct by design).
- `app/services/reader_profile.py`: `get_reader_profile(db, user_id)` — view queries via `text()` + `.mappings().all()`; rating distribution via ORM group-by; `_to_float()` helper for Decimal coercion; returns plain dict.
- `app/schemas/reader_profile.py`: `GenreAffinity`, `AuthorAffinity`, `PaceByGenre`, `ReaderProfile` — plain Pydantic, no `from_attributes`.
- `app/routers/reader_profile.py`: single JWT-protected `GET /reader-profile` endpoint.
- `app/dependencies.py`: switched from `OAuth2PasswordBearer` to `HTTPBearer` — Swagger UI was showing an OAuth2 form incompatible with our JSON login endpoint; HTTPBearer shows a plain token paste field instead.
- Tested locally: correct response shape, null avg_rating for unrated authors, empty genre lists when genre field is unpopulated on books (data gap, not a bug).

### 2026-05-15 — Phase 4 complete (PRs #49, #50)
- `alembic/versions/0005_analytics_views.py`: four PostgreSQL views (`v_books_per_month`, `v_reading_pace`, `v_genre_breakdown`, `v_author_breakdown`), each including `user_id` for per-user isolation. Fixed `EXTRACT(DAY FROM date_diff)` — `DATE - DATE` returns `INTEGER` in PostgreSQL, not `INTERVAL`; replaced with direct `::int` cast.
- `app/services/analytics.py`: five module-level functions — ORM queries for summary stats (`func.avg` with explicit `float()` coercion to avoid `Decimal` Pydantic errors); `text()` + `.mappings()` for view-backed aggregate queries.
- `app/schemas/analytics.py`: `SummaryStats`, `BooksOverTimeItem`, `GenreItem`, `AuthorItem`, `PaceItem` — plain Pydantic, no `from_attributes` (built from dicts, not ORM objects).
- `app/routers/analytics.py`: five JWT-protected GET endpoints under `/analytics`.
- `frontend/src/pages/Stats.jsx`: five parallel `useQuery` calls, summary stat cards, four Recharts `BarChart`s (vertical for books-over-time, horizontal for genre/author/pace), stone color palette, per-section empty states and loading skeletons.
- `frontend/src/App.jsx`: `/stats` route added inside `ProtectedRoute > Layout`.
- `frontend/src/components/Layout.jsx`: "Stats" nav link added to desktop and mobile nav.
- Recharts (`^3.8.1`) added as frontend dependency; `npm install` must be run in `frontend/` after merging any PR that adds npm dependencies (now documented in CLAUDE.md).

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
