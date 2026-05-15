# Bookshelf Architecture Summary

This document explains the Bookshelf repo as a full-stack learning project. It is written to answer two questions:

1. What technical choices were made?
2. How do those choices stitch together into a working app?

Bookshelf is currently a personal book-logging app. Users register, log in, add books to their own shelf, create reading records, and track reading status, dates, ratings, notes, and reading pace. The current implementation covers the core backend and frontend. The repo is already shaped for later phases: Open Library metadata enrichment, analytics, ML recommendations, and an OpenAI-backed reading companion.

## System At A Glance

```text
Browser
  |
  | React app
  | React Router pages
  | TanStack Query server-state cache
  | Axios client with JWT interceptor
  v
FastAPI backend
  |
  | Routers: HTTP endpoints
  | Dependencies: auth and DB session injection
  | Services: reusable business rules
  | Schemas: Pydantic API contracts
  | Models: SQLAlchemy database mapping
  v
PostgreSQL
  |
  | Alembic migrations own schema history
  v
Persistent application data
```

The application is intentionally conventional. The frontend owns UI and browser state. The backend owns authorization, validation, business rules, and persistence. PostgreSQL is the only durable state store.

## Repository Layout

```text
app/
  main.py                 FastAPI app creation, CORS, startup DB check, router registration
  database.py             Lazy SQLAlchemy engine/session setup
  dependencies.py         Shared FastAPI dependencies, especially current_user
  routers/                HTTP route handlers
  services/               Business logic that should not live in route handlers
  models/                 SQLAlchemy ORM models
  schemas/                Pydantic request/response models
  adapters/               Reserved boundary for external providers

frontend/
  src/main.jsx            React entry point and global providers
  src/App.jsx             Route tree
  src/api/client.js       Central Axios instance
  src/contexts/           AuthContext for JWT state
  src/components/         Shared UI components and route protection
  src/pages/              Screen-level components

alembic/                  Database migration environment and revisions
tests/                    FastAPI TestClient end-to-end API tests
docker-compose.yml        Local API and PostgreSQL stack
Dockerfile                Backend container image
pyproject.toml            Backend dependencies and pytest config
frontend/package.json     Frontend dependencies and scripts
```

This layout separates concerns by layer. A route should not directly know how password hashing works. A React page should not import raw `axios`. A database schema change should not be done manually outside Alembic. Those boundaries are what keep the project understandable as it grows.

## Backend Architecture

The backend is a synchronous FastAPI app using SQLAlchemy sessions against PostgreSQL.

### FastAPI Entry Point

`app/main.py` does four important things:

- Loads environment variables with `python-dotenv`.
- Creates the `FastAPI` app.
- Adds CORS middleware so the Vite frontend can call the API from `http://localhost:5173`.
- Includes the auth, books, and reading-log routers.

It also defines a lifespan startup check that runs `SELECT 1` against the database. That gives early feedback if the app starts without a valid database connection.

The technical choice here is pragmatic: FastAPI gives type-aware request parsing, automatic OpenAPI docs, dependency injection, and a low-friction path from simple route functions to more structured services.

### Database Session Management

`app/database.py` creates a SQLAlchemy engine lazily. That matters because environment variables must be loaded before `DATABASE_URL` is read. If the engine were created at import time, tests and app startup could fail depending on import order.

The engine is configured with:

- `pool_size=5`
- `max_overflow=10`
- `pool_timeout=30`
- `pool_recycle=1800`
- `pool_pre_ping=True`

Those settings are friendly to hosted PostgreSQL providers such as Supabase. `pool_pre_ping=True` checks connections before reuse, which helps avoid stale connection failures. `pool_recycle=1800` refreshes long-lived connections.

The `get_db()` dependency yields a session per request and closes it afterward. Route handlers receive the session through FastAPI dependency injection.

### Routers

Routers live in `app/routers/`:

- `auth.py` exposes `/auth/register` and `/auth/login`.
- `books.py` exposes CRUD endpoints for books.
- `reading_logs.py` exposes CRUD endpoints for reading records.

The routers are intentionally thin. They should parse HTTP input, call services or ORM queries, translate errors to HTTP responses, and return Pydantic response schemas.

This is visible in `reading_logs.py`: route handlers delegate most reusable behavior to `app/services/reading_logs.py`. The books router currently contains simple query logic directly because the operations are still small.

### Services

Services hold business rules that are bigger than request/response mechanics.

`app/services/auth.py` owns:

- bcrypt password hashing
- bcrypt password verification
- JWT creation
- JWT decoding
- lazy reads of `SECRET_KEY` and token expiry settings

`app/services/reading_logs.py` owns:

- `compute_pace(start_date, end_date)`
- checking that a user can only create a log for a book they own
- joined loading of book summaries for reading-log responses
- status filtering and pagination
- recomputing `pace_days` after updates

The most important design idea is ownership enforcement. The app does not rely on the frontend hiding other users' data. Backend queries include `user_id == current_user.id`.

### Schemas

Schemas live in `app/schemas/` and use Pydantic.

The repo separates:

- create schemas for incoming POST payloads
- read schemas for API responses
- update schemas for PATCH payloads

For example, `BookCreate` accepts the fields a client may submit when adding a book. `BookRead` includes server-owned fields such as `id`, `user_id`, and `created_at`. `BookUpdate` makes fields optional so PATCH can update only selected fields.

This separation is important because ORM models are not API contracts. The database may contain fields the API should not expose, and the API may need nested response shapes that do not match one table exactly.

### Models

SQLAlchemy models live in `app/models/`.

The main entities are:

- `User`
- `Book`
- `ReadingLog`
- `Tag`
- `reading_log_tags` association table

All primary keys are UUIDs. UUIDs are useful when records may eventually be created across distributed systems or exposed publicly in URLs. They also avoid sequential ID leakage.

The important relationships are:

```text
User 1 -> many Books
User 1 -> many ReadingLogs
Book 1 -> many ReadingLogs
ReadingLog many <-> many Tags
```

`ReadingLog` is the central table for future analytics and ML. It stores:

- `status`: `read`, `reading`, or `want_to_read`
- `start_date`
- `end_date`
- `rating`
- `notes`
- `pace_days`
- `mood`

Even if some fields are lightly used today, keeping them from the beginning preserves data needed by later recommendation and analytics features.

### Authentication And Authorization

Authentication uses stateless JWTs:

1. The user registers with email and password.
2. The backend hashes the password using bcrypt.
3. The user logs in.
4. The backend verifies the password and returns a signed JWT.
5. The frontend stores the token in `localStorage`.
6. Axios sends `Authorization: Bearer <token>` on future requests.
7. FastAPI's `get_current_user` dependency decodes the token and loads the user from the database.

This is stateless because the server does not store sessions. If the JWT is valid and signed with the current `SECRET_KEY`, the request can be authenticated.

The tradeoff is that JWT revocation is harder than server-side sessions. For this phase, stateless JWTs are a good fit because they keep the API simple and deployable on ordinary web hosts.

Authorization is separate from authentication. Authentication answers "who are you?" Authorization answers "can you access this record?" Books and reading logs are filtered by `current_user.id`.

## API Surface

Public endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Basic health check |
| `POST` | `/auth/register` | Create a user |
| `POST` | `/auth/login` | Return a JWT |

Authenticated endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/books` | Add a book to the current user's shelf |
| `GET` | `/books` | List the current user's books |
| `GET` | `/books/{book_id}` | Fetch one owned book |
| `PATCH` | `/books/{book_id}` | Update one owned book |
| `DELETE` | `/books/{book_id}` | Delete one owned book |
| `POST` | `/reading-logs` | Create a reading record for an owned book |
| `GET` | `/reading-logs` | List reading records, optionally filtered by status |
| `GET` | `/reading-logs/{log_id}` | Fetch one owned reading record |
| `PATCH` | `/reading-logs/{log_id}` | Update one owned reading record |
| `DELETE` | `/reading-logs/{log_id}` | Delete one owned reading record |

The frontend primarily works with reading logs because a shelf item is really "a book plus my reading state for that book." That is why `ReadingLogRead` includes a nested `BookSummary`.

## Database And Migrations

The database is PostgreSQL. SQLAlchemy maps Python classes to tables. Alembic owns schema changes.

The migration history shows the design evolving:

- `0001_initial_schema.py` creates users, books, reading logs, tags, and the reading-status enum.
- `0002_add_reading_log_rating_check.py` adds a database-level rating constraint.
- `0003_books_user_id.py` makes books user-owned.
- `0004_books_isbn_composite_unique.py` changes ISBN uniqueness from global to per-user.

The per-user ISBN constraint is subtle but important. Two different users should be able to add the same book. One user should not accidentally create duplicate copies of the same ISBN. The database enforces this with a unique partial index on `(user_id, isbn)` where ISBN is not null.

Alembic is the right tool here because it makes schema changes reviewable, repeatable, and deployable. A future production database can be upgraded with the same migration scripts used locally.

## Frontend Architecture

The frontend is a Vite React app using:

- React for UI composition
- React Router for page routing
- TanStack Query for server-state fetching and cache invalidation
- Axios for HTTP
- Tailwind CSS for styling

### React Entry Point

`frontend/src/main.jsx` wraps the app in:

- `BrowserRouter`
- `QueryClientProvider`
- `AuthProvider`

That provider order means every page can use routing, server-state queries, and auth context.

### Routing

`frontend/src/App.jsx` defines the route tree:

- `/` redirects to `/books`
- `/login` and `/register` are public
- `/books`, `/books/add`, and `/books/:id` are protected
- unknown paths render `NotFound`

Protected routes are implemented with `ProtectedRoute`, which checks whether `AuthContext` has a token. If not, it redirects to `/login`.

### API Client

`frontend/src/api/client.js` centralizes Axios configuration.

It sets `baseURL` from `VITE_API_URL`, falling back to `http://localhost:8000`. It also registers:

- a request interceptor that attaches the JWT from `localStorage`
- a response interceptor that clears stored auth and redirects to `/login` on `401`

This keeps auth mechanics out of pages. Pages call `client.get(...)`, `client.post(...)`, and so on without repeatedly wiring headers.

### Auth Context

`frontend/src/contexts/AuthContext.jsx` owns browser auth state:

- `token`
- `user`
- `login`
- `register`
- `logout`

It persists `bs_token` and `bs_user` in `localStorage`, which survives page refreshes. This is simple and useful for a learning app. The tradeoff is that localStorage is accessible to JavaScript, so XSS would be serious. A future hardening pass could consider httpOnly cookies, CSRF handling, and refresh-token rotation.

### Server State With TanStack Query

TanStack Query is used where the frontend reads or mutates API data.

Examples:

- `Books.jsx` fetches reading logs for the active status tab using a query key like `['reading-logs', activeTab]`.
- `AddBook.jsx` invalidates `['reading-logs']` after creating a book and log.
- `BookDetail.jsx` invalidates `['reading-logs']` after editing or deleting records.

The distinction is useful:

- server state is data owned by the backend
- local UI state is data owned by the component, such as form drafts, active tab, and loading state

TanStack Query reduces manual loading/error/cache logic.

### Main User Workflows

#### Register And Login

```text
Register form
  -> AuthContext.register()
  -> POST /auth/register
  -> POST /auth/login
  -> store JWT in localStorage
  -> protected app can now load
```

#### View Shelf

```text
Books page
  -> active tab is reading/read/want_to_read
  -> TanStack Query calls GET /reading-logs?status=<tab>
  -> Axios adds Bearer token
  -> FastAPI validates current_user
  -> service queries only that user's logs
  -> response includes nested book summary
  -> BookCard renders each shelf item
```

#### Add Book

```text
AddBook form
  -> frontend validates required fields and simple date/rating rules
  -> POST /books
  -> backend creates a Book owned by current_user
  -> POST /reading-logs with returned book_id
  -> backend verifies the book belongs to current_user
  -> backend computes pace_days if dates are present
  -> frontend invalidates reading-log queries
  -> navigate to /books/:id
```

This two-step flow reflects the data model: a book record and a reading-log record are related but distinct.

#### Edit Reading Record

```text
BookDetail page
  -> fetch book by id
  -> fetch reading logs
  -> find the log for that book
  -> user edits status, rating, notes, dates
  -> PATCH /reading-logs/{log_id}
  -> backend updates fields and recomputes pace_days
  -> frontend invalidates cached reading logs
```

## Local Development

Backend local development is containerized:

```bash
docker compose up -d
docker compose exec api sh -c 'alembic upgrade head'
```

`docker-compose.yml` runs:

- `api`: the FastAPI app on port `8000`
- `postgres`: PostgreSQL 16 on port `5432`

The API container gets `DATABASE_URL` pointing at the Compose service name `postgres`. That is why the in-container URL is different from the host-machine URL.

Frontend local development runs outside Docker:

```bash
cd frontend
npm install
npm run dev
```

Vite serves the app on port `5173`. The Vite config includes a development proxy from `/api` to `http://localhost:8000`, although the current Axios client uses `VITE_API_URL` or the localhost API URL directly.

## Testing Strategy

The current tests live in `tests/test_e2e.py`. They use FastAPI's `TestClient` and a real database configured by `DATABASE_URL`.

The tests cover:

- register and login
- create book
- create reading log
- update reading log to `read`
- verify `pace_days`
- list reading history
- unauthenticated requests return `401`
- duplicate ISBN is allowed across different users
- one user cannot log another user's book
- one user cannot see another user's book

These tests are closer to API integration tests than pure unit tests. That is appropriate for this stage because most risk is in the stitching: routing, auth dependencies, database commits, relationships, constraints, and serialization.

## Deployment Shape

The intended production split is:

```text
Vercel
  hosts React static frontend

Render
  runs FastAPI container

Supabase
  provides managed PostgreSQL
```

This split keeps each layer on infrastructure that matches its job:

- Vercel is optimized for frontend hosting.
- Render can run the Python API container.
- Supabase provides hosted PostgreSQL without managing a database server directly.

Environment variables are the contract between code and deployment:

- `DATABASE_URL`
- `SECRET_KEY`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `CORS_ORIGINS`
- `VITE_API_URL`

Secrets are not committed. `.env.example` files document what must be supplied.

## External Provider Boundary

The repo includes `app/adapters/` as the intended home for external integrations. It is currently mostly empty because the implemented phases focus on core auth, books, reading logs, and frontend flows.

The adapter-first rule matters for later phases:

- Open Library calls should live behind a metadata adapter.
- OpenAI calls should live behind an LLM adapter.
- scikit-learn model access should live behind an ML adapter.

That keeps provider-specific details out of routers and services. A service should ask for "book metadata" or "recommendations", not know how a specific provider SDK is called.

## Why These Technical Choices Fit

### FastAPI

FastAPI is a strong fit for a typed JSON API. It pairs well with Pydantic schemas, exposes interactive docs automatically, and has straightforward dependency injection for database sessions and authenticated users.

### PostgreSQL

The app stores relational data: users own books, books have logs, logs can have tags. PostgreSQL gives strong constraints, transactions, indexes, UUID support, date types, and managed hosting options.

### SQLAlchemy

SQLAlchemy gives Python models for relational tables while still preserving access to database concepts such as indexes, foreign keys, enum types, cascades, and explicit sessions.

### Alembic

Alembic makes schema history explicit. This is essential once a deployed database has real user data. The code model and the database schema can evolve together through migrations.

### JWT And bcrypt

bcrypt is appropriate for password hashing because it is intentionally slow and salted. JWTs keep the API stateless, which simplifies deployment and horizontal scaling at this phase.

### React And Vite

React is used for component-based UI. Vite gives a fast development server and simple production build pipeline. The app is small enough that React Router and page-level components are easy to reason about.

### TanStack Query

Server state has different needs than local state: caching, refetching, loading states, error states, and invalidation after mutations. TanStack Query handles those concerns better than manually combining `useEffect` and `useState` for every API call.

### Axios

Axios gives a single place to configure base URLs and interceptors. In this app, that centralization is important because every authenticated request needs the same Bearer-token behavior.

### Tailwind CSS

Tailwind keeps styling local to components and avoids building a custom CSS architecture too early. For a small product UI, this is phase-appropriate and keeps iteration fast.

### Docker Compose

Docker Compose makes local backend development reproducible. The API and database run together, and the API can depend on PostgreSQL health before starting.

### uv

`uv` provides fast Python dependency installation and lockfile-based reproducibility. The Dockerfile uses `uv sync --frozen --no-dev` so container builds use the locked dependency set.

## Design Tradeoffs And Current Limitations

The repo is intentionally phase-appropriate, so some choices are simple rather than fully enterprise-grade.

- JWTs in localStorage are easy to implement but require strong XSS hygiene.
- There is no refresh-token flow yet.
- The frontend user object stores only email, not a full `/me` profile response.
- The add-book flow creates a book and then a reading log in two client-side calls; a future endpoint could make that atomic.
- Tags exist in the data model but are not exposed in the frontend yet.
- The metadata adapter boundary exists, but Open Library integration is not implemented in the inspected code yet.
- The frontend fetches all reading logs on the detail page and finds the matching log client-side; a future endpoint could fetch by book id.

These are reasonable constraints for the current phase. The important thing is that the existing boundaries make the next improvements straightforward.

## Mental Model For Future Changes

When adding a feature, trace it through the stack:

1. Does the data model need to change?
   - Add or update SQLAlchemy models.
   - Add an Alembic migration.
2. What is the API contract?
   - Add or update Pydantic schemas.
   - Keep request and response models separate.
3. Where does the business rule belong?
   - Put reusable rules in services.
   - Keep routers thin.
4. Does the feature call an external provider?
   - Add an adapter.
   - Keep provider SDK calls out of routers and services.
5. How does the frontend consume it?
   - Add API calls through `src/api/client.js`.
   - Use TanStack Query for server state.
   - Use local state only for UI drafts and controls.
6. How is ownership enforced?
   - Filter backend queries by `current_user.id`.
   - Do not trust the frontend for authorization.
7. What tests prove the stitching works?
   - Add focused API integration tests for auth, ownership, validation, and persistence.

That workflow matches the architecture already in the repo and keeps the app understandable as it grows.
