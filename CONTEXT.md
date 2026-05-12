# CONTEXT.md

Working state for the current build session. Updated by the agent at the end of every session. Read this alongside `CLAUDE.md`.

---

## Current Phase

**Phase 1 — Core Data Model**
A stable backend that can store books and reading records.
Done when: an authenticated user can log a book and retrieve their reading history via the API.

---

## Stories

- [ ] #8 Scaffold FastAPI project and Docker Compose
- [ ] #9 SQLAlchemy models: users, books, reading_logs, tags
- [ ] #10 Alembic migrations: initial schema
- [ ] #11 Supabase connection and environment config
- [ ] #12 JWT authentication: registration and login
- [ ] #13 CRUD endpoints: books
- [ ] #14 CRUD endpoints: reading records
- [ ] #15 End-to-end smoke test

Work top to bottom — each story depends on the one above it.

---

## Session Notes

_No sessions run yet. The agent should update this section at the end of each session: what was completed, any decisions made, anything the next session needs to know._
