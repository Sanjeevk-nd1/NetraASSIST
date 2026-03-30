"""
Celery tasks for batch document processing.

Each question is an independent Celery task, enabling:
- Fair scheduling across multiple jobs & users
- Automatic retry on transient failures (rate limits)
- Cancel support via Redis-backed revocation
- Parallel processing bounded by worker concurrency
"""
import json
import logging
import time
from datetime import datetime

from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
from sqlalchemy import text

from backend.celery_app import celery  # noqa: F401 — ensures app is loaded
from backend.database import SessionLocal
from backend.services.rag_service import answer_question_with_sources

logger = logging.getLogger(__name__)


# ── Per-question task ────────────────────────────────────────────────────

@shared_task(
    bind=True,
    name="backend.tasks.process_question",
    max_retries=3,
    soft_time_limit=120,   # seconds — LLM should respond within 2 min
    time_limit=150,        # hard kill after 2.5 min
    acks_late=True,
    reject_on_worker_lost=True,
)
def process_question(self, question_id, batch_id):
    """Process a single question: call RAG pipeline, store result."""
    db = SessionLocal()
    try:
        # Check if job was canceled first (cheap check)
        job = db.execute(text("""
            SELECT cancel_requested FROM batch_jobs WHERE id = :batch_id
        """), {"batch_id": batch_id}).mappings().fetchone()

        if not job:
            logger.warning("Job %s not found, skipping question %s", batch_id, question_id)
            return {"status": "skipped"}

        if job["cancel_requested"]:
            logger.info("Job %s canceled, skipping question %s", batch_id, question_id)
            return {"status": "canceled"}

        # Atomically claim the question — only if it's still pending/error.
        # This prevents duplicate processing when stale tasks exist in Redis.
        claimed = db.execute(text("""
            UPDATE batch_questions
            SET status = 'processing', updated_at = :now
            WHERE id = :id AND batch_id = :batch_id AND status IN ('pending', 'error')
            RETURNING id, question
        """), {"id": question_id, "batch_id": batch_id, "now": datetime.utcnow()}).mappings().fetchone()
        db.commit()

        if not claimed:
            # Already processed/canceled by another task or manually — skip
            logger.info("Question %s already claimed/done, skipping", question_id)
            return {"status": "skipped"}

        # Call the RAG pipeline (use_cache=True: skip LLM if same question was answered before)
        started = time.perf_counter()
        result = answer_question_with_sources(claimed["question"], use_cache=True)
        latency_ms = int((time.perf_counter() - started) * 1000)

        # Re-check cancel AFTER the LLM call — if canceled mid-flight, honor it
        job_after = db.execute(text("""
            SELECT cancel_requested FROM batch_jobs WHERE id = :batch_id
        """), {"batch_id": batch_id}).mappings().fetchone()
        if job_after and job_after["cancel_requested"]:
            db.execute(text("""
                UPDATE batch_questions
                SET status = 'canceled', updated_at = :now
                WHERE id = :id
            """), {"id": question_id, "now": datetime.utcnow()})
            db.commit()
            _refresh_and_maybe_finalize(db, batch_id)
            return {"status": "canceled"}

        # Store result
        db.execute(text("""
            UPDATE batch_questions
            SET answer = :answer,
                sources = :sources,
                status = 'answered',
                cached = :cached,
                llm_model = :llm_model,
                retrieval_strategy = :retrieval_strategy,
                latency_ms = :latency_ms,
                error_details = NULL,
                updated_at = :now
            WHERE id = :id
        """), {
            "id": question_id,
            "answer": result["answer"],
            "sources": json.dumps(result["sources"]),
            "cached": result.get("cached", False),
            "llm_model": result.get("model"),
            "retrieval_strategy": result.get("retrieval_strategy"),
            "latency_ms": latency_ms,
            "now": datetime.utcnow(),
        })
        db.commit()
        _refresh_and_maybe_finalize(db, batch_id)
        return {"status": "answered", "question_id": question_id}

    except SoftTimeLimitExceeded:
        logger.warning("Question %s hit soft time limit", question_id)
        db.rollback()
        _mark_error(db, question_id, batch_id, "Request timed out. Please retry.")
        return {"status": "error", "question_id": question_id}

    except Exception as exc:
        db.rollback()
        error_msg = str(exc)
        is_rate_limit = "429" in error_msg or "rate" in error_msg.lower()

        if is_rate_limit and self.request.retries < self.max_retries:
            # Exponential backoff: 15s, 30s, 60s
            backoff = 15 * (2 ** self.request.retries)
            logger.warning(
                "Rate-limited on question %s, retrying in %ds (attempt %d/%d)",
                question_id, backoff, self.request.retries + 1, self.max_retries,
            )
            # Reset status to pending so UI shows it's queued
            db.execute(text("""
                UPDATE batch_questions
                SET status = 'pending', updated_at = :now
                WHERE id = :id
            """), {"id": question_id, "now": datetime.utcnow()})
            db.commit()
            raise self.retry(countdown=backoff, exc=exc)

        logger.error("Question %s failed: %s", question_id, error_msg[:300])
        _mark_error(db, question_id, batch_id, error_msg)
        return {"status": "error", "question_id": question_id}

    finally:
        db.close()


def _mark_error(db, question_id, batch_id, error_msg):
    """Mark a question as error and update job counters."""
    try:
        db.execute(text("""
            UPDATE batch_questions
            SET answer = :answer,
                status = 'error',
                cached = false,
                error_details = :error_details,
                updated_at = :now
            WHERE id = :id
        """), {
            "id": question_id,
            "answer": "Error generating answer. Please try regenerating.",
            "error_details": str(error_msg)[:1000],
            "now": datetime.utcnow(),
        })
        db.commit()
        _refresh_and_maybe_finalize(db, batch_id)
    except Exception:
        db.rollback()


def _refresh_and_maybe_finalize(db, batch_id):
    """Refresh counters, and auto-finalize the job if all questions are done.
    Uses row-level locking to prevent race conditions with concurrent workers."""
    try:
        stats = db.execute(text("""
            SELECT
                COUNT(*) FILTER (WHERE status IN ('answered', 'accepted', 'error')) AS processed_count,
                COUNT(*) FILTER (WHERE status = 'accepted') AS accepted_count,
                COUNT(*) FILTER (WHERE status = 'error') AS error_count,
                COUNT(*) FILTER (WHERE cached = true) AS cached_count,
                COUNT(*) FILTER (WHERE status IN ('pending', 'processing')) AS active_count,
                COUNT(*) FILTER (WHERE status = 'canceled') AS canceled_count
            FROM batch_questions
            WHERE batch_id = :batch_id
        """), {"batch_id": batch_id}).mappings().fetchone()

        db.execute(text("""
            UPDATE batch_jobs
            SET processed_count = :processed_count,
                accepted_count = :accepted_count,
                error_count = :error_count,
                cached_count = :cached_count,
                updated_at = :now
            WHERE id = :batch_id
        """), {
            "batch_id": batch_id,
            "processed_count": stats["processed_count"] or 0,
            "accepted_count": stats["accepted_count"] or 0,
            "error_count": stats["error_count"] or 0,
            "cached_count": stats["cached_count"] or 0,
            "now": datetime.utcnow(),
        })

        active = (stats["active_count"] or 0)
        if active == 0:
            # Lock the row to prevent concurrent finalization
            job = db.execute(text("""
                SELECT cancel_requested, status FROM batch_jobs
                WHERE id = :batch_id
                FOR UPDATE SKIP LOCKED
            """), {"batch_id": batch_id}).mappings().fetchone()

            if job and job["status"] in ("processing", "canceling"):
                canceled_count = stats["canceled_count"] or 0
                was_canceled = job["cancel_requested"]
                final_status = "canceled" if (was_canceled and canceled_count > 0) else "completed"

                db.execute(text("""
                    UPDATE batch_jobs
                    SET status = :status,
                        completed_at = :now,
                        updated_at = :now
                    WHERE id = :batch_id AND status IN ('processing', 'canceling')
                """), {
                    "batch_id": batch_id,
                    "status": final_status,
                    "now": datetime.utcnow(),
                })

        db.commit()
    except Exception as e:
        logger.error("Failed to refresh counters for batch %s: %s", batch_id, e)
        db.rollback()


# ── Batch dispatch helper (called from the API route) ────────────────────

def dispatch_batch(batch_id):
    """Enqueue all pending/error/canceled questions in a batch as individual Celery tasks."""
    # Pre-check: verify at least one Celery worker is alive (short timeout to avoid blocking)
    try:
        ping = celery.control.inspect(timeout=1.0).ping()
        if not ping:
            raise RuntimeError("No Celery workers available. Please start the worker process.")
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Cannot connect to task queue: {e}")

    db = SessionLocal()
    try:
        questions = db.execute(text("""
            SELECT id FROM batch_questions
            WHERE batch_id = :batch_id AND status IN ('pending', 'error', 'canceled')
            ORDER BY row_index ASC
        """), {"batch_id": batch_id}).mappings().all()

        if not questions:
            return 0

        # Mark them all as pending (reset errors/canceled ones)
        db.execute(text("""
            UPDATE batch_questions
            SET status = 'pending', updated_at = :now
            WHERE batch_id = :batch_id AND status IN ('pending', 'error', 'canceled')
        """), {"batch_id": batch_id, "now": datetime.utcnow()})
        db.commit()

        # Dispatch each question as an independent Celery task
        with celery.connection_or_acquire() as conn:
            for q in questions:
                process_question.apply_async(
                    args=[str(q["id"]), batch_id],
                    queue="batch",
                    connection=conn,
                )

        logger.info("Dispatched %d questions for batch %s", len(questions), batch_id)
        return len(questions)
    finally:
        db.close()


def cancel_batch_tasks(batch_id):
    """Cancel all pending Celery tasks for a batch and mark remaining questions as canceled."""
    db = SessionLocal()
    try:
        # Mark any still-pending questions in DB as canceled
        db.execute(text("""
            UPDATE batch_questions
            SET status = 'canceled', updated_at = :now
            WHERE batch_id = :batch_id AND status IN ('pending', 'processing')
        """), {"batch_id": batch_id, "now": datetime.utcnow()})
        db.commit()

        # Revoke any queued Celery tasks (uses Redis broadcast)
        # Note: this only revokes tasks not yet picked up by a worker.
        # Tasks already running will check cancel_requested themselves.
        celery.control.revoke(
            # We can't target specific task IDs easily, but the tasks check
            # cancel_requested in the DB, so in-flight tasks will self-cancel.
            terminate=False,
        )
    finally:
        db.close()
