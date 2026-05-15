#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── .env setup ────────────────────────────────────────────────────────────────
if [ ! -f "$ROOT/.env" ]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo "Created .env from .env.example — update SECRET_KEY before going to production"
fi

if [ ! -f "$ROOT/frontend/.env" ]; then
  cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env"
fi

# ── Frontend deps ─────────────────────────────────────────────────────────────
if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install --prefix "$ROOT/frontend" --silent
fi

# ── Docker services ───────────────────────────────────────────────────────────
echo "Starting Docker services..."
docker compose -f "$ROOT/docker-compose.yml" up -d --build

echo "Running migrations..."
(cd "$ROOT" && uv run alembic upgrade head)

# ── Frontend dev server ───────────────────────────────────────────────────────
echo "Starting frontend..."
npm run dev --prefix "$ROOT/frontend" > "$ROOT/.frontend.log" 2>&1 &
echo $! > "$ROOT/.frontend.pid"

echo ""
echo "Bookshelf is running"
echo "  Frontend: http://localhost:5173"
echo "  API:      http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "Frontend logs: tail -f $ROOT/.frontend.log"
echo "API logs:      docker compose logs -f api"
echo "Stop:          ./scripts/stop.sh"
