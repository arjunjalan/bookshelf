# CLAUDE.md — Bookshelf

Architectural brief for every Claude Code session in this repo. Read this and `CONTEXT.md` before touching any code.

---

## What This Is

Bookshelf is a personal book-logging and reading companion app. Users log books, track reading history, and — across phases — get analytics, ML-powered recommendations, and a conversational reading companion backed by OpenAI.

Product context, ADRs, and design decisions live in the Obsidian vault (arjunjalan/second-brain).

---

## Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Database | PostgreSQL via Supabase — SQLAlchemy ORM, Alembic migrations |
| Containerisation | Docker Compose (local development) |
| Frontend | React + Vite + Tailwind CSS |
| Auth | JWT — bcrypt passwords, no server-side session state |
| Book metadata | Open Library API via MetadataAdapter |
| ML | scikit-learn via MLAdapter |
| LLM | OpenAI API via LLMAdapter |
| Hosting | Render (API) · Vercel (frontend) · Supabase (database) |

---

## Project Structure

```
bookshelf/
├── app/
│   ├── routers/        # FastAPI route handlers — thin, no business logic
│   ├── services/       # Business logic
│   ├── adapters/       # External provider wrappers (MetadataAdapter, LLMAdapter, MLAdapter)
│   ├── models/         # SQLAlchemy ORM models
│   ├── schemas/        # Pydantic request/response schemas
│   └── main.py         # FastAPI app entry point
├── alembic/            # Migrations
├── tests/
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## Architecture Principles

Non-negotiable. Every code decision must pass against these.

1. **Adapter-first** — all external providers (OpenAI, Open Library, ML model) sit behind adapter classes in `app/adapters/`. No provider SDK calls in service or router code.
2. **Stateless API** — durable state lives in PostgreSQL only. No in-memory state between requests.
3. **Secrets in env vars only** — nothing sensitive committed. `.env.example` documents all required vars.
4. **Alembic for all schema changes** — never modify the database directly or outside a migration.
5. **Phase-appropriate complexity** — build only what the current phase needs. No premature abstractions.

---

## Data Model

`reading_logs` is the most important table — Phase 4 analytics and Phase 5 ML train on it. These fields must exist from Phase 1, even if unused until later phases:

- `rating` (1–5 integer)
- `start_date`, `end_date` (pace computation)
- `pace_days` (computed: end_date minus start_date)
- `mood` (optional free text, Phase 5 signal)
- `notes` (free text)

Do not strip these to simplify early phases. Historical records cannot be reconstructed.

---

## Conventions

- Pydantic schemas are separate from ORM models — never return a SQLAlchemy model directly from a route
- Separate `Create`, `Read`, `Update` Pydantic schemas per entity
- All data endpoints require authentication via `current_user` dependency
- Users can only access their own data — enforce in DB queries, not just middleware
- Python `logging` with structured output — no print statements
- `pyproject.toml` for dependency management

---

## Running Locally

```bash
cp .env.example .env   # fill in DATABASE_URL, SECRET_KEY
docker compose up      # starts api + postgres
```

API: `http://localhost:8000`  
Docs: `http://localhost:8000/docs`

---

## Navigation

- Current work and session state: `CONTEXT.md`
- GitHub Project (all phases): https://github.com/users/arjunjalan/projects/1
- Product vault (ADRs, vision, roadmap): https://github.com/arjunjalan/second-brain
