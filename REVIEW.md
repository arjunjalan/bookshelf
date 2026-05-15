# End-to-End Web App Review

Codex reviewed the current full-stack Bookshelf app against the repo
instructions in the updated `AGENTS.md` and the actual frontend/API behavior
in the codebase.

## Scope

- React + Vite frontend pages, routing, auth context, and API client
- FastAPI auth, books, and reading-log endpoints
- SQLAlchemy models and Alembic constraints relevant to user-facing flows
- End-to-end contract between frontend actions and backend responses

## Findings

1. ~~**High: "Remove from shelf" deletes only the reading log, not the book.**
   `frontend/src/pages/BookDetail.jsx` calls
   `DELETE /reading-logs/${log.id}` for the remove action. The book remains in
   the database, direct `/books/:id` still loads, and the same button can later
   attempt `/reading-logs/undefined`. Since the backend already supports
   cascading `DELETE /books/{book_id}`, the frontend should likely delete the
   book instead of only deleting its log.~~ **Fixed in PR #30** — frontend now calls `DELETE /books/{id}`; cascade removes the log.

2. ~~**Medium: duplicate ISBN conflicts return an unhandled server error.**
   `app/routers/books.py` commits creates and updates without catching
   `IntegrityError`, while the model and migration enforce unique
   `(user_id, isbn)` when `isbn` is present. A user adding or editing to a
   duplicate ISBN gets a `500` instead of a clean `409` or validation message.~~ **Fixed in PR #30** — `IntegrityError` caught in create and update, returns 409.

3. ~~**Medium: expired or invalid tokens leave the frontend in a dead
   authenticated state.** `AuthContext` treats any stored `bs_token` as
   authenticated, and the Axios client only attaches the token. There is no
   `401` response handling to clear local storage and redirect to login. After
   token expiry, protected pages stay accessible while API queries fail.~~ **Fixed in PR #30** — Axios response interceptor clears storage and redirects to `/login` on 401.

4. **Low: backend accepts negative reading pace.**
   `app/services/reading_logs.py` computes `end_date - start_date` without
   validating date order. The add-book form blocks this client-side, but direct
   API calls or future UI paths can persist negative `pace_days`.

5. **Low: frontend API base URL bypasses the configured dev proxy and masks
   missing deployment config.** `frontend/vite.config.js` defines a `/api`
   proxy, and `frontend/.env.example` documents `VITE_API_URL`, but
   `frontend/src/api/client.js` falls back to `http://localhost:8000`. If
   `VITE_API_URL` is missing in a hosted frontend build, browser requests go to
   the user's own machine instead of the Render API. A relative `/api` default
   or a fail-fast missing-env check would better match the updated frontend
   convention that `VITE_API_URL` controls the backend URL.

## Verification

- `npm run lint` passed.
- `npm run build` passed.
- `uv run pytest` passed: 7 tests.
