# ── Stage 1: Build frontend ──────────────────────────────────────────
FROM node:20-alpine AS frontend-build

ARG VITE_MS_SSO_CLIENT_ID
ARG VITE_MS_SSO_TENANT_ID
ARG VITE_MS_SSO_REDIRECT

WORKDIR /app
COPY package.json ./
RUN npm install --production=false
COPY frontend/ ./frontend/
COPY .env* ./
RUN npx vite build --config frontend/vite.config.js


# ── Stage 2: Production image ────────────────────────────────────────
FROM python:3.11-slim

# System deps for psycopg2-binary, health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

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

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -sf -o /dev/null -w '%{http_code}' http://localhost:${PORT}/api/auth/me | grep -qE '(200|401)' || exit 1

# Default: run gunicorn (Celery runs as a separate container via docker-compose)
CMD ["sh", "-c", "gunicorn --workers ${GUNICORN_WORKERS:-9} --threads ${GUNICORN_THREADS:-4} --bind 0.0.0.0:${PORT:-3002} --timeout 120 --keep-alive 5 --preload --access-logfile - --error-logfile - backend.app:app"]
