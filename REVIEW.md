# Phase 1 Architecture Review

Codex reviewed Claude's Phase 1 implementation against the architectural
principles in `AGENTS.md` and the Phase 1 definition in `CONTEXT.md`.

## Review Scope

- FastAPI routers, schemas, services, and dependencies
- SQLAlchemy models and Alembic migrations
- Authentication and environment configuration
- End-to-end test coverage for the Phase 1 API flow

## Findings

1. `reading_logs.rating` was not constrained to the required 1-5 range.
   `AGENTS.md` identifies `reading_logs` as the critical future analytics and
   ML table, so Codex recommended enforcing the range in both API validation
   and the database.

2. Protected routes opened a database session before resolving authentication.
   This meant unauthenticated requests could fail on database configuration or
   availability before returning `401`.

3. Routers returned SQLAlchemy ORM objects directly. FastAPI response models
   serialized those objects, but the project convention says routes should not
   return ORM models directly.

4. JWT signing used a known runtime fallback secret. Codex recommended keeping
   secrets documented in `.env.example` while requiring runtime configuration
   to provide real values.

5. Reading-log business logic lived in the router. The pace calculation and
   persistence/update workflow were small, but `AGENTS.md` calls for thin route
   handlers and business logic in `app/services/`.

## Changes Made

- Added Pydantic `rating` validation with `ge=1` and `le=5` for reading-log
  create and update schemas.
- Added Alembic migration `0002_add_reading_log_rating_check.py` with a
  database check constraint for nullable ratings between 1 and 5.
- Added `app/services/reading_logs.py` for pace calculation, create, list,
  lookup, and update behavior.
- Updated reading-log routes to delegate business logic to the service layer.
- Reordered protected route dependencies so authentication resolves before
  database session creation.
- Updated book, reading-log, and registration routes to return explicit
  Pydantic schema instances instead of ORM objects.
- Removed the application-level fallback JWT secret and made Docker Compose
  read `SECRET_KEY` from the environment.

## Result

The Phase 1 implementation is now closer to the non-negotiable principles in
`AGENTS.md`: durable data is protected at the database boundary, routers are
thinner, protected endpoints authenticate first, schema changes are tracked via
Alembic, and runtime secrets must come from the environment.
