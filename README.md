# Bookshelf

A personal book-logging and reading companion app. Log books, track your reading history, and — in later phases — get analytics, ML-powered recommendations, and a conversational reading companion.

## Stack

| Layer | Technology |
|---|---|
| API | FastAPI (Python 3.12) |
| Database | PostgreSQL — SQLAlchemy 2.0 ORM, Alembic migrations |
| Auth | JWT (bcrypt + python-jose, stateless) |
| Frontend | React + Vite + Tailwind CSS v3 + TanStack Query v5 + Axios |
| Package management | uv (backend) · npm (frontend) |
| Containerisation | Docker Compose |
| CI | GitHub Actions |
| Hosting | Render (API) · Vercel (frontend) · Supabase (database) |

## Project Structure

```
bookshelf/
├── app/
│   ├── routers/        # FastAPI route handlers — thin, no business logic
│   ├── services/       # Business logic
│   ├── adapters/       # External provider wrappers (Open Library, OpenAI, ML)
│   ├── models/         # SQLAlchemy ORM models
│   ├── schemas/        # Pydantic request/response schemas
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── api/        # Axios client
│   │   ├── contexts/   # AuthContext (JWT state)
│   │   ├── components/ # Layout, ProtectedRoute, BookCard
│   │   └── pages/      # Login, Register, Books, AddBook, BookDetail
│   ├── .env.example
│   └── vite.config.js
├── alembic/            # Database migrations
├── tests/
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

## Getting Started

**Prerequisites:** Docker, Docker Compose, [uv](https://docs.astral.sh/uv/), Node.js 18+

```bash
git clone https://github.com/arjunjalan/bookshelf.git
cd bookshelf
cp .env.example .env          # fill in DATABASE_URL and SECRET_KEY
./scripts/start.sh
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

```bash
./scripts/stop.sh             # stop everything
```

### Tests

```bash
uv run pytest                 # backend unit + integration tests
npx playwright test           # E2E smoke tests (requires servers running)
```

## API Overview

All endpoints except `/health`, `/auth/register`, and `/auth/login` require a Bearer token.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Get JWT token |
| `POST` | `/books` | Add a book to your catalog |
| `GET` | `/books` | List your books (paginated) |
| `GET` | `/books/{id}` | Get a book |
| `PATCH` | `/books/{id}` | Update a book |
| `DELETE` | `/books/{id}` | Delete a book |
| `POST` | `/reading-logs` | Log a reading record |
| `GET` | `/reading-logs` | List reading history (filterable by status) |
| `GET` | `/reading-logs/{id}` | Get a reading record |
| `PATCH` | `/reading-logs/{id}` | Update a reading record |
| `DELETE` | `/reading-logs/{id}` | Remove a book from your shelf |
| `GET` | `/metadata/search?q=` | Search Open Library for book metadata |
| `GET` | `/health` | Health check |

Reading status values: `reading`, `read`, `want_to_read`

## Roadmap

- [x] **Phase 1** — Core backend: auth, book catalog, reading logs, E2E tests
- [x] **Phase 2** — Frontend (React + Vite + Tailwind)
- [x] **Phase 3** — Book metadata enrichment via Open Library API
- [ ] **Phase 4** — Reading analytics
- [ ] **Phase 5** — ML predictions and recommendations
- [ ] **Phase 6** — Natural language interface (OpenAI)
