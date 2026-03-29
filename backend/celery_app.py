"""
Celery application factory.

Usage:
    Start worker:  celery -A backend.celery_app worker --concurrency=4 --loglevel=info
"""
import os

from dotenv import load_dotenv

# Load .env before anything else so all configs are available
_env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)

from celery import Celery

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

celery = Celery(
    "netraassist",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery.conf.update(
    # Explicit broker/backend — prevents kombu from losing the URL
    broker_url=REDIS_URL,
    result_backend=REDIS_URL,
    # Broker connection retry on startup
    broker_connection_retry_on_startup=True,
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    # Timezone
    timezone="UTC",
    enable_utc=True,
    # Concurrency — each worker process handles N concurrent tasks (I/O bound LLM calls)
    worker_concurrency=int(os.environ.get("DOC_PROCESS_MAX_WORKERS", "4")),
    # Prefetch multiplier — don't grab too many tasks ahead; keeps fair scheduling
    worker_prefetch_multiplier=1,
    # Task result expiry (1 hour)
    result_expires=3600,
    # Rate limit per-task (applied per worker)
    # Prevents a single user from monopolising the LLM
    task_default_rate_limit="30/m",
    # Late ack — only acknowledge a task AFTER it completes, so if worker dies
    # the task goes back to the queue automatically
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    # Task routes — batch questions go to the 'batch' queue for isolation
    task_routes={
        "backend.tasks.*": {"queue": "batch"},
    },
)

# Auto-discover tasks from backend.tasks
celery.autodiscover_tasks(["backend"])
