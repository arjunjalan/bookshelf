#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Frontend dev server ───────────────────────────────────────────────────────
if [ -f "$ROOT/.frontend.pid" ]; then
  PID=$(cat "$ROOT/.frontend.pid")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "Stopped frontend (PID $PID)"
  fi
  rm "$ROOT/.frontend.pid"
fi

# ── Docker services ───────────────────────────────────────────────────────────
echo "Stopping Docker services..."
docker compose -f "$ROOT/docker-compose.yml" down

echo "Done"
