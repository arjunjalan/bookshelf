# Bookshelf Architecture and Code Review

Review restarted against local `main` at `9d20e93` on 2026-05-16.

Project context checked:

- GitHub issues: Phases 1-6 are closed; Phase 7 production deployment (#51) is open.
- Planning repo roadmap: Phase 7 goal is Vercel frontend, Render backend, Supabase database, env/secrets/health checks, and no local dependencies.
- Technical vision: adapter-first providers, PostgreSQL as durable source of truth, cost-conscious LLM usage, server-side prompt construction, CORS locked down in production, and eventual exportability of user data.

## Executive Summary

The app has grown in the right architectural direction. The backend keeps provider calls behind adapters, user-owned book/log queries are enforced server-side, Alembic owns the schema, and the React app consistently routes normal API calls through a shared Axios client. The Phase 4-6 additions also fit the intended "structured data -> analytics/profile -> chat companion" product arc.

The main risks now are production-readiness issues around the new chat path and data invariants. The streaming chat endpoint is useful, but it currently has no request bounds or rate controls, bypasses shared auth handling on the frontend, and keeps conversation state entirely in the browser. There are also still server-side validation gaps that can poison analytics and reader profile data.

## Findings

### 1. High: frontend lint currently fails on `main`

`npm run lint --prefix frontend` fails with two errors:

- `frontend/src/pages/Chat.jsx:62` mutates `assistantContent` inside the async streaming loop. The React hooks lint rule treats this as mutation of an immutable value.
- `frontend/tailwind.config.js:7` uses `require()` in an ESM config file, so ESLint reports `require` as undefined.

This is a current quality-gate failure. `npm run build --prefix frontend` passes, but a production deployment or CI job that includes lint will fail.

Recommended fix:

- Store streaming assistant text in a mutable `useRef` or derive the next content inside the state updater without mutating a local variable flagged by the React compiler lint.
- Change Tailwind config to ESM import style, or explicitly configure the config file environment.
- Add frontend lint to CI so this does not regress silently.

### 2. High: `/chat` has no request bounds, rate limits, or token budget controls

`ChatRequest` accepts an unconstrained `message: str` and an unconstrained `history` list (`app/schemas/chat.py:11-13`). The service prepends all client-provided history and sends it directly to the LLM (`app/services/chat.py:85-89`). The frontend sends the entire in-memory conversation on every request (`frontend/src/pages/Chat.jsx:16-33`).

For Phase 7 this is a cost and availability risk. A single user, browser bug, or scripted request can submit very large histories, drive up OpenRouter token usage, hold Render workers open, and degrade the app for everyone. The planning repo explicitly calls out LLM cost controls as a cross-cutting concern.

Recommended fix:

- Add Pydantic constraints: non-empty trimmed messages, max message length, max history items, and max content length per history item.
- Truncate or summarize history server-side before calling the adapter.
- Add per-user rate limiting for `/chat` before public deployment.
- Consider `max_tokens` and provider timeout settings in `OpenRouterAdapter.chat_stream()`.

### 3. High: streaming chat can hold request resources open longer than necessary

`post_chat()` injects a request-scoped SQLAlchemy `Session` and passes it into a generator returned by `StreamingResponse` (`app/routers/chat.py:20-48`). The generator then calls `get_chat_stream()`, which fetches the reader profile and yields from the LLM stream (`app/services/chat.py:75-89`).

Even though the database is only needed to build the prompt, the current shape ties the DB dependency lifecycle to the streaming response path. Under concurrent slow LLM streams, this can unnecessarily keep request/session resources alive. On Render/Supabase free-tier-style limits, this is exactly the kind of resource coupling that becomes painful.

Recommended fix:

- Materialize the prompt context before returning `StreamingResponse`.
- Close the DB session before entering the LLM streaming loop.
- Pass a ready `messages` list or system prompt string to the stream generator instead of passing `db` into it.

### 4. Medium: chat uses native `fetch()` and bypasses shared 401 handling

Most frontend API calls go through `frontend/src/api/client.js`, whose response interceptor clears `bs_token` and `bs_user` and redirects to `/login` on 401. Chat cannot use Axios for streaming, so it uses native `fetch()` (`frontend/src/pages/Chat.jsx:25-39`), but it does not replicate that 401 behavior.

When a token expires, a chat request will show an inline error while `AuthContext` still considers the user authenticated because local storage is unchanged. This reintroduces the dead-authenticated-state problem already fixed for Axios-backed pages.

Recommended fix:

- Add a small shared auth failure helper, for example `clearAuthAndRedirect()`, used by both Axios interceptor and streaming fetch.
- In Chat, if `response.status === 401`, clear storage and redirect to `/login`.

### 5. Medium: chat history is entirely client-owned and not durable

The technical vision says chat history should be stored in PostgreSQL, not in-memory. The current implementation keeps `messages` only in React state (`frontend/src/pages/Chat.jsx:8`) and sends that client-owned history back to the server (`frontend/src/pages/Chat.jsx:33`). The backend trusts and forwards that history to the LLM (`app/services/chat.py:85-89`).

This is acceptable for a Phase 6 prototype, but it is not production-grade companion state:

- Refreshing the page loses the conversation.
- There is no cross-device continuity.
- Chat transcripts are not part of the durable user data model.
- The server cannot audit, trim, summarize, or export conversations reliably.

Recommended fix:

- Add `chat_threads` and `chat_messages` tables when chat becomes more than an ephemeral UI.
- Store user and assistant messages server-side, scoped by `user_id`.
- Have the server select/summarize recent relevant context instead of trusting the browser as the conversation source of truth.

### 6. Medium: server-side validation still permits analytics-corrupting data

The UI blocks some invalid inputs, but the API does not enforce the same invariants:

- `compute_pace()` returns negative values when `end_date < start_date` (`app/services/reading_logs.py:12-15`).
- `ReadingLogCreate` and `ReadingLogUpdate` do not validate date ordering (`app/schemas/reading_log.py:19-26`, `app/schemas/reading_log.py:47-53`).
- `BookCreate` and `BookUpdate` allow negative or zero `page_count` (`app/schemas/book.py:8-16`, `app/schemas/book.py:45-53`).
- `title` and `author` are plain strings without trimming/min-length constraints (`app/schemas/book.py:8-10`).

Because Phase 4 analytics and Phase 5 reader profiles depend on this data, direct API calls can create negative pace charts, bad averages, and low-quality LLM context.

Recommended fix:

- Add Pydantic validators or constrained fields for title, author, page count, and date ordering.
- Add a database check constraint for `pace_days IS NULL OR pace_days >= 0`.
- Add tests for negative pace and invalid page counts.

### 7. Medium: `BookDetail` can lose the reading record after the first 50 logs

`BookDetail` loads one book by id, then fetches `/reading-logs` with no params and finds the matching log client-side (`frontend/src/pages/BookDetail.jsx:45-56`). The API default for `/reading-logs` is `limit=50` (`app/routers/reading_logs.py:32-37`).

Once a user has more than 50 logs, opening an older book can produce `log === undefined` even though the book and log both exist. That hides the reading record and prevents editing it from the detail page.

Recommended fix:

- Add an endpoint/query for `GET /reading-logs?book_id=...`, or include the current user's latest reading log in `GET /books/{id}`.
- At minimum, have the frontend request a larger limit intentionally, but a book-scoped query is the cleaner contract.

### 8. Medium: Phase 4-6 behavior is barely covered by automated tests

Backend tests cover auth, book CRUD, log CRUD, and basic ownership (`tests/test_e2e.py`). Playwright covers add-book and editing a detail record (`tests/e2e/smoke.spec.js`). There are no tests for:

- Analytics view endpoints.
- Reader profile output.
- `/chat` auth behavior.
- SSE chunk framing and `[DONE]`.
- LLM adapter behavior behind a fake adapter.
- Frontend chat streaming and 401 handling.

This is now a meaningful risk because the active Phase 7 work will expose these paths publicly.

Recommended fix:

- Add backend unit tests using dependency override for `get_llm_adapter`.
- Test that `/chat` streams `data: {"chunk": ...}` and finishes with `[DONE]`.
- Add analytics/profile fixture data tests.
- Add frontend lint to CI, and consider a small Playwright chat test with the network route mocked.

### 9. Low: `OpenRouterAdapter` has a stale code default for `LLM_MODEL`

`.env.example` and `docker-compose.yml` default to `openrouter/free`, but `OpenRouterAdapter` still falls back to `meta-llama/llama-3.1-8b-instruct:free` when `LLM_MODEL` is absent (`app/adapters/open_router.py:14-18`). `CONTEXT.md` notes that this model was removed and replaced during Phase 6 fixes.

This is easy to miss in deployment: a missing env var silently routes to a known-bad default.

Recommended fix:

- Change the code default to `openrouter/free`, or fail fast when `LLM_MODEL` is missing in non-local environments.
- Add a startup/config check for required production env vars.

## Positive Architecture Notes

- External providers are behind adapters: `MetadataAdapter`/`OpenLibraryAdapter` and `LLMAdapter`/`OpenRouterAdapter` follow the project principle.
- User data ownership is enforced in backend queries for books and reading logs.
- Alembic migrations include the analytics/profile views rather than relying on manual database changes.
- The reader profile service keeps LLM context server-side; the frontend does not receive hidden prompt context.
- Streaming SSE is a good fit for the user experience and avoids Axios limitations cleanly.

## Verification

- `uv run pytest` passed: 7 tests.
- `npm run build --prefix frontend` passed. Vite reported a large chunk warning for the built JS bundle.
- `npm run lint --prefix frontend` failed with the two errors listed in finding #1.

