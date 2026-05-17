# Bookshelf

Bookshelf is a full-stack reading companion for tracking a personal library, logging reading history, importing Goodreads data, reviewing reading analytics, and chatting with an LLM that has context from your shelf.

The app is built as a production-style web application: authenticated API, persistent Postgres data model, background metadata enrichment, analytics endpoints, a responsive React frontend, PWA install support, offline caching, and deployment targets for Render, Vercel, and Supabase.

## Live App

- Frontend: https://bookshelf-rose.vercel.app
- API: https://bookshelf-jhno.onrender.com
- API docs: https://bookshelf-jhno.onrender.com/docs

Render free-tier services may cold start after inactivity.

## What It Does

- Track books across `Want to Read`, `Reading`, and `Read` shelves.
- Start from a logged-out landing page, then use a post-login home dashboard for current reading, recent finishes, top preferences, and chat prompts.
- Add books through Open Library search with a quick shelf picker.
- Automatically enrich books with cover art, descriptions, publication dates, and page counts where available.
- Import a Goodreads CSV export, including shelf, dates, rating, and notes.
- Record reading logs with rating, start/end dates, computed pace, mood, and notes.
- Review analytics for reading volume, genre/author distribution, average rating, and reading pace.
- Build a reader profile from historical preferences and reading behavior.
- Chat with a reading companion backed by OpenRouter/OpenAI-compatible chat models, with persisted conversation history and shelf-aware context.
- Install the frontend as a PWA with app icons, standalone display mode, iOS safe-area handling, and offline fallbacks for cached app routes, API reads, and book cover images.

## Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, Python 3.12 |
| Database | PostgreSQL, SQLAlchemy 2.0, Alembic |
| Auth | Stateless JWT, bcrypt password hashes |
| Frontend | React, Vite, Tailwind CSS, TanStack Query, Axios |
| PWA | Web app manifest, custom service worker, install icons, offline fallback |
| Metadata | Open Library API behind a MetadataAdapter |
| LLM | OpenRouter via OpenAI-compatible client behind an LLMAdapter |
| Testing | Pytest, Playwright |
| Local dev | Docker Compose, uv, npm |
| Production | Render API, Vercel frontend, Supabase Postgres |

## Architecture

Bookshelf keeps route handlers thin and pushes business logic into services. External systems are isolated behind adapters so the app does not couple routers or services directly to provider SDKs.

```text
bookshelf/
├── app/
│   ├── routers/        # FastAPI route handlers
│   ├── services/       # Business logic
│   ├── adapters/       # Open Library, OpenRouter/LLM, future ML providers
│   ├── models/         # SQLAlchemy ORM models
│   ├── schemas/        # Pydantic request/response schemas
│   └── main.py         # FastAPI app entry point
├── frontend/
│   ├── src/
│   │   ├── api/        # Axios client and auth interceptor
│   │   ├── contexts/   # AuthContext
│   │   ├── components/ # Layout, bottom nav, route guards, shelf cards, UI primitives
│   │   └── pages/      # Landing, home, shelf, add book, detail, stats, chat, import
│   ├── public/         # Manifest, service worker, icons, offline fallback
│   └── scripts/        # Icon generation
├── alembic/            # Database migrations
├── scripts/            # Local dev and maintenance scripts
├── tests/              # Backend and metadata tests
└── docker-compose.yml
```

Core principles:

- All user data is scoped by authenticated user at query time.
- Pydantic schemas stay separate from SQLAlchemy models.
- PostgreSQL is the only durable state store.
- Schema changes go through Alembic migrations.
- Provider integrations go through adapter classes in `app/adapters/`.
- Frontend API calls go through `frontend/src/api/client.js`.
- The frontend is a single-page app with Vercel rewrites and a custom service worker for PWA/offline behavior.

## Local Development

### Prerequisites

- Docker and Docker Compose
- Python 3.12
- [uv](https://docs.astral.sh/uv/)
- Node.js 18+
- npm

### Start the App

```bash
git clone https://github.com/arjunjalan/bookshelf.git
cd bookshelf
cp .env.example .env
cp frontend/.env.example frontend/.env
./scripts/start.sh
```

The start script installs frontend dependencies when needed, starts Docker services, runs Alembic migrations, and launches the Vite dev server.

- Frontend: http://localhost:5173
- API: http://localhost:8000
- API docs: http://localhost:8000/docs

Stop everything with:

```bash
./scripts/stop.sh
```

### Environment

Backend settings live in `.env`:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bookshelf
SECRET_KEY=change-this
ACCESS_TOKEN_EXPIRE_MINUTES=1440
METADATA_PROVIDER=open_library
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-your-key-here
LLM_MODEL=openrouter/free
```

Frontend settings live in `frontend/.env`:

```bash
VITE_API_URL=http://localhost:8000
```

The app runs without an LLM key for core shelf and analytics workflows, but chat requires `OPENROUTER_API_KEY`.

## Development Commands

Backend:

```bash
uv run pytest
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Frontend:

```bash
npm install --prefix frontend
npm run dev --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
npm run generate-icons --prefix frontend
```

End-to-end tests:

```bash
npm install
npx playwright install
npm run test:e2e
```

Metadata backfill for older records:

```bash
uv run python scripts/backfill_metadata.py --email you@example.com --limit 50
uv run python scripts/backfill_metadata.py --email you@example.com --dry-run
```

Omit `--email` only for local/admin backfills across all users.

## Frontend Routes

| Route | Purpose |
|---|---|
| `/` | Logged-out landing page |
| `/login` | Sign in |
| `/register` | Create an account |
| `/home` | Authenticated dashboard |
| `/books` | Shelf grouped by reading status |
| `/books/add` | Search Open Library or add a book manually |
| `/books/{id}` | Rich book detail and reading log editor |
| `/stats` | Analytics dashboard |
| `/chat` | Reader-aware chat companion |
| `/import` | Goodreads CSV import |

On mobile, primary authenticated navigation is handled by the fixed bottom nav: Home, Shelf, Stats, and Chat. Secondary actions like Add book, Import, and Log out stay in the mobile menu.

## API Surface

All endpoints except `/health`, `/auth/register`, and `/auth/login` require a Bearer token.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/auth/register` | Create an account |
| `POST` | `/auth/login` | Exchange credentials for a JWT |
| `GET` | `/books` | List the authenticated user's books |
| `POST` | `/books` | Add a book |
| `GET` | `/books/{id}` | Fetch one book |
| `PATCH` | `/books/{id}` | Update book metadata |
| `DELETE` | `/books/{id}` | Delete a book and associated logs |
| `GET` | `/reading-logs` | List reading logs, optionally filtered by status or book |
| `POST` | `/reading-logs` | Create a reading log |
| `GET` | `/reading-logs/{id}` | Fetch one reading log |
| `PATCH` | `/reading-logs/{id}` | Update status, dates, rating, mood, or notes |
| `DELETE` | `/reading-logs/{id}` | Delete a reading log |
| `GET` | `/metadata/search` | Search Open Library metadata |
| `POST` | `/import/csv` | Import a Goodreads CSV export |
| `GET` | `/analytics/summary` | Reading totals, averages, and top genre |
| `GET` | `/analytics/books-over-time` | Finished books by month |
| `GET` | `/analytics/by-genre` | Read counts by genre |
| `GET` | `/analytics/by-author` | Read counts by author |
| `GET` | `/analytics/pace` | Days-to-finish data |
| `GET` | `/reader-profile` | Structured preference profile |
| `GET` | `/chat/sessions` | List persisted chat sessions |
| `GET` | `/chat/sessions/{id}/messages` | List messages for a chat session |
| `POST` | `/chat` | Stream a shelf-aware assistant response |

Reading status values are `want_to_read`, `reading`, and `read`.

## PWA and Offline Behavior

The frontend includes a PWA manifest at `frontend/public/manifest.json`, install icons generated from `frontend/public/icon.svg`, and a custom service worker at `frontend/public/sw.js`.

Caching strategy:

- Static Vite assets and local public images use cache-first caching.
- Open Library cover images use cache-first caching.
- Cross-origin API `GET` requests use network-first caching with a cached fallback.
- Navigations use network-first caching, then cached app shell, then `offline.html`.
- Old named caches are removed during service worker activation.

iOS support includes standalone mode metadata, `apple-touch-icon`, translucent status bar mode, and safe-area padding for the top nav and bottom nav.

## Data Model Notes

`reading_logs` is the behavioral core of the product. It stores:

- status
- rating
- start and end dates
- computed `pace_days`
- mood
- notes

Those fields power analytics, reader profiling, and chat context. Historical reading data is treated as durable product data, not disposable UI state.

## Production Deployment

Current production deployment:

- Frontend: Vercel
- API: Render Docker service
- Database: Supabase Postgres

Important production settings:

- `VITE_API_URL` on Vercel points to the Render API URL.
- `CORS_ORIGINS` on Render includes the Vercel frontend origin.
- `DATABASE_URL` on Render uses the Supabase pooler URL when required by network support.
- The Docker `CMD` runs `alembic upgrade head` before starting Uvicorn so migrations apply on container start.

## Project Status

Completed:

- Core authenticated API and user-scoped data model
- React frontend and protected app shell
- Logged-out landing page and authenticated home dashboard
- Open Library metadata search and enrichment
- Goodreads CSV import
- Reading analytics dashboard
- Reader profile endpoint
- Streaming LLM chat with persisted sessions
- Mobile UI polish with bottom navigation and iOS safe-area handling
- PWA foundation with manifest, install icons, service worker, and offline fallback
- Production deployment

Backlog:

- Social/friends layer
- Broader recommendation workflows
- Push notifications and background sync, if the product needs them
- Production hardening beyond the current personal-app deployment profile
