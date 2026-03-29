#!/bin/bash
set -e

MODE="${1:-dev}"  # dev or prod
PORT="${PORT:-3002}"

# ── Check ports ──────────────────────────────────────────────────────
if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $PORT is already in use. Stop the existing process before running start.sh."
  exit 1
fi

# ── Ensure Redis is running ──────────────────────────────────────────
if ! redis-cli ping >/dev/null 2>&1; then
  echo "Starting Redis..."
  redis-server --daemonize yes
  sleep 1
fi

# ── Start Celery worker (background) ────────────────────────────────
echo "Starting Celery worker..."
celery -A backend.celery_app worker \
  --queues=batch \
  --concurrency="${DOC_PROCESS_MAX_WORKERS:-4}" \
  --loglevel=info \
  --without-heartbeat \
  --without-mingle &
CELERY_PID=$!
sleep 2

if [ "$MODE" = "prod" ]; then
  # ── Production mode: gunicorn with multiple workers ────────────────
  echo "Starting backend (production mode — gunicorn on port $PORT)..."
  gunicorn \
    --workers "${GUNICORN_WORKERS:-4}" \
    --threads "${GUNICORN_THREADS:-4}" \
    --bind "0.0.0.0:$PORT" \
    --timeout 120 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile - \
    "backend.app:app" &
  BACKEND_PID=$!
else
  # ── Development mode: Flask dev server ─────────────────────────────
  echo "Starting backend (development mode)..."
  python3 main.py &
  BACKEND_PID=$!
fi
sleep 2

if [ "$MODE" = "prod" ]; then
  echo "=== NetraASSIST running in PRODUCTION mode ==="
  echo "  Backend:  http://localhost:$PORT (gunicorn)"
  echo "  Celery:   PID $CELERY_PID"
  echo "Press Ctrl+C to stop all services."
  wait $BACKEND_PID
else
  # ── Start frontend dev server ──────────────────────────────────────
  echo "Starting frontend dev server..."
  npm run dev -- --port 5173
fi

# ── Cleanup on exit ──────────────────────────────────────────────────
kill $BACKEND_PID 2>/dev/null
kill $CELERY_PID 2>/dev/null
