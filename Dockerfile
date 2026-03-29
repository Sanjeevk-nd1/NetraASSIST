# ── Stage 1: Build frontend ──────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app
COPY package.json ./
RUN npm install --production=false
COPY frontend/ ./frontend/
RUN npx vite build --config frontend/vite.config.js


# ── Stage 2: Production image ────────────────────────────────────────
FROM python:3.11-slim

# System deps for psycopg2-binary, health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps
COPY pyproject.toml ./
RUN pip install --no-cache-dir .

# App code
COPY backend/ ./backend/
COPY pageindex_rag:/ ./pageindex_rag:/
COPY main.py start.sh ./
RUN chmod +x start.sh

# Built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Ensure upload/download dirs exist
RUN mkdir -p backend/uploads backend/downloads

ENV PORT=3002
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/auth/me || exit 1

# Default: run gunicorn (Celery runs as a separate container via docker-compose)
CMD ["sh", "-c", "gunicorn --workers ${GUNICORN_WORKERS:-4} --threads ${GUNICORN_THREADS:-4} --bind 0.0.0.0:${PORT:-3002} --timeout 120 --keep-alive 5 --access-logfile - --error-logfile - backend.app:app"]
