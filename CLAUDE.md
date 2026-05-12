# CLAUDE.md — Bookshelf

This file is the architectural brief for every Claude Code session in this repo. Read it before touching any code.

---

## What This Is

Bookshelf is a personal book-logging and reading companion app. Users log books, track reading history, and — across later phases — get analytics, ML-powered recommendations, and a conversational reading companion backed by OpenAI.

Product context, ADRs, and design decisions live in the Obsidian vault. This file covers what you need to build.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Database | PostgreSQL via Supabase — SQLAlchemy ORM, Alembic migrations |
| Containerisation | Docker Compose for local development |
| Frontend | React + Vite + Tailwind CSS (Phase 2+) |
| Auth | JWT — bcrypt passwords, no server-side session state |
| Book metadata | Open Library API via MetadataAdapter (Phase 3+) |
| ML | scikit-learn via MLAdapter (Phase 5+) |
| LLM | OpenAI API via LLMAdapter (Phase 6+) |
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

## Current Phase: Phase 1 — Core Data Model

**Goal:** A stable backend that can store books and reading records.

**Build in this order:**

1. FastAPI skeleton + Docker Compose → issue #8
2. SQLAlchemy models: `users`, `books`, `reading_logs`, `tags` → issue #9
3. Alembic initial migration → issue #10
4. Supabase connection + environment config → issue #11
5. JWT auth: register + login → issue #12
6. CRUD endpoints: books → issue #13
7. CRUD endpoints: reading logs → issue #14
8. End-to-end smoke test → issue #15

**Done when:** An authenticated user can log a book and retrieve their reading history via the API.

---

## Data Model Notes

`reading_logs` is the most important table in the system — Phase 4 analytics and Phase 5 ML train on it. Capture signal from day one, even if unused in Phase 1:

- `rating` — integer 1–5
- `start_date`, `end_date` — for pace computation
- `pace_days` — computed field (end_date minus start_date)
- `mood` — optional free text, Phase 5 feature signal
- `notes` — free text

Do not strip these to simplify Phase 1. Historical records cannot be reconstructed later.

---

## Key Conventions

- Pydantic schemas are separate from ORM models — never return a SQLAlchemy model directly from a route
- Use separate `Create`, `Read`, `Update` Pydantic schemas per entity
- All data endpoints require authentication via `current_user` dependency
- Users can only access their own data — enforce in DB queries, not just middleware
- Use Python `logging` with structured output — no print statements

---

## Running Locally

```bash
cp .env.example .env   # fill in DATABASE_URL, SECRET_KEY
docker compose up      # starts api + postgres
```

API: `http://localhost:8000`  
Docs: `http://localhost:8000/docs`

---

## Work Items

GitHub Project: https://github.com/users/arjunjalan/projects/1  
Phase 1 epic: https://github.com/arjunjalan/bookshelf/issues/1

Pick up the next open story from the Phase 1 epic, implement it, and close the issue when done.
