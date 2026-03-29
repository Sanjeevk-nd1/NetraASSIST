from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy import text
from functools import wraps
from datetime import datetime
import uuid
import os
import sys
import bcrypt

from backend.database import SessionLocal
from backend.api.auth import log_audit
from backend.services.sharepoint_sync_service import (
    SHAREPOINT_PROFILES,
    get_all_sharepoint_configs,
    get_sharepoint_config,
    save_sharepoint_config,
    sync_sharepoint_documents,
)

admin_bp = Blueprint('admin', __name__)


def _profile_from_request():
    profile = request.args.get("profile") or (request.get_json(silent=True) or {}).get("profile") or "knowledge"
    if profile not in SHAREPOINT_PROFILES:
        return None
    return profile


def _load_user_row(db, user_id):
    return db.execute(text("""
        SELECT id, email, full_name, role, is_active, created_at, last_login
        FROM users
        WHERE id = :id
    """), {"id": user_id}).mappings().fetchone()


def _is_protected_user(row) -> bool:
    return bool(row and row.get("role") == "super_admin")

def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get('role') not in ('admin', 'super_admin'):
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper

def super_admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get('role') != 'super_admin':
            return jsonify({"error": "Super Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper

@admin_bp.route('/api/admin/users', methods=['GET'])
@admin_required
def list_users():
    db = SessionLocal()
    try:
        rows = db.execute(text("""
            SELECT id, email, full_name, role, is_active, created_at, last_login
            FROM users ORDER BY created_at DESC
        """)).fetchall()

        return jsonify([{
            "id": str(r[0]),
            "email": r[1],
            "full_name": r[2],
            "role": r[3],
            "is_active": r[4],
            "is_protected": r[3] == 'super_admin',
            "created_at": r[5].isoformat() if r[5] else None,
            "last_login": r[6].isoformat() if r[6] else None,
        } for r in rows])
    finally:
        db.close()

@admin_bp.route('/api/admin/users', methods=['POST'])
@admin_required
def create_user():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    role = data.get('role', 'user')
    admin_id = get_jwt_identity()

    if not email or not password or not full_name:
        return jsonify({"error": "All fields are required"}), 400
    if not email.lower().endswith('@netradyne.com'):
        return jsonify({"error": "Only @netradyne.com email addresses are allowed"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if role not in ('user', 'admin'):
        return jsonify({"error": "Invalid role"}), 400

    db = SessionLocal()
    try:
        existing = db.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": email}
        ).fetchone()
        if existing:
            return jsonify({"error": "Email already registered"}), 409

        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user_id = str(uuid.uuid4())
        db.execute(text("""
            INSERT INTO users (id, email, password_hash, full_name, role)
            VALUES (:id, :email, :password_hash, :full_name, :role)
        """), {
            "id": user_id,
            "email": email,
            "password_hash": password_hash,
            "full_name": full_name,
            "role": role,
        })
        db.commit()
        log_audit(admin_id, None, "user_created", "user", user_id, f"Created {email} with role {role}")
        return jsonify({"message": "User created", "id": user_id}), 201
    except Exception:
        db.rollback()
        return jsonify({"error": "An error occurred. Please try again."}), 500
    finally:
        db.close()

@admin_bp.route('/api/admin/users/<user_id>/role', methods=['PUT'])
@admin_required
def update_user_role(user_id):
    data = request.get_json()
    new_role = data.get('role')
    admin_id = get_jwt_identity()

    if new_role not in ('user', 'admin'):
        return jsonify({"error": "Invalid role"}), 400

    db = SessionLocal()
    try:
        target = _load_user_row(db, user_id)
        if not target:
            return jsonify({"error": "User not found"}), 404
        if _is_protected_user(target):
            return jsonify({"error": "The default admin cannot be changed"}), 403

        db.execute(text("""
            UPDATE users SET role = :role WHERE id = :id
        """), {"role": new_role, "id": user_id})
        db.commit()

        log_audit(admin_id, None, "role_changed", "user", user_id, f"New role: {new_role}")

        return jsonify({"message": "Role updated"})
    except Exception as e:
        db.rollback()
        return jsonify({"error": "An error occurred. Please try again."}), 500
    finally:
        db.close()

@admin_bp.route('/api/admin/users/<user_id>/status', methods=['PUT'])
@admin_required
def update_user_status(user_id):
    data = request.get_json()
    is_active = data.get('is_active', True)
    admin_id = get_jwt_identity()

    db = SessionLocal()
    try:
        target = _load_user_row(db, user_id)
        if not target:
            return jsonify({"error": "User not found"}), 404
        if _is_protected_user(target):
            return jsonify({"error": "The default admin cannot be changed"}), 403

        db.execute(text("""
            UPDATE users SET is_active = :is_active WHERE id = :id
        """), {"is_active": is_active, "id": user_id})
        db.commit()

        status = "activated" if is_active else "deactivated"
        log_audit(admin_id, None, f"user_{status}", "user", user_id, f"{status.title()} user: {target['email']} ({target['full_name'] or 'N/A'})")

        return jsonify({"message": f"User {status}"})
    except Exception as e:
        db.rollback()
        return jsonify({"error": "An error occurred. Please try again."}), 500
    finally:
        db.close()


@admin_bp.route('/api/admin/users/<user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    admin_id = get_jwt_identity()

    db = SessionLocal()
    try:
        target = _load_user_row(db, user_id)
        if not target:
            return jsonify({"error": "User not found"}), 404
        if _is_protected_user(target):
            return jsonify({"error": "The default admin cannot be deleted"}), 403
        if str(admin_id) == str(user_id):
            return jsonify({"error": "You cannot delete your own account"}), 400

        db.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
        db.commit()

        log_audit(admin_id, None, "user_deleted", "user", user_id, f"Deleted user: {target['email']}")
        return jsonify({"message": "User deleted"})
    except Exception:
        db.rollback()
        return jsonify({"error": "An error occurred. Please try again."}), 500
    finally:
        db.close()

@admin_bp.route('/api/admin/audit-logs', methods=['GET'])
@admin_required
def get_audit_logs():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))
    offset = (page - 1) * per_page
    search = (request.args.get('search') or '').strip()
    action_filter = (request.args.get('action') or '').strip()
    time_range = (request.args.get('range') or '').strip()       # e.g. '15m','30m','1h','24h','7d','30d'
    time_from = (request.args.get('from') or '').strip()         # custom ISO
    time_to = (request.args.get('to') or '').strip()             # custom ISO

    db = SessionLocal()
    try:
        # --- Purge logs older than 30 days ---
        db.execute(text("DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '30 days'"))
        db.commit()

        where_clauses = ["a.created_at >= NOW() - INTERVAL '30 days'"]
        params = {"limit": per_page, "offset": offset}

        if search:
            where_clauses.append(
                "(a.user_email ILIKE :search OR a.action ILIKE :search "
                "OR a.details ILIKE :search OR a.ip_address ILIKE :search "
                "OR u.full_name ILIKE :search)"
            )
            params["search"] = f"%{search}%"

        if action_filter:
            where_clauses.append("a.action = :action_filter")
            params["action_filter"] = action_filter

        # Server-side time range - more reliable than client timestamps
        range_map = {'15m': '15 minutes', '30m': '30 minutes', '1h': '1 hour',
                     '24h': '24 hours', '7d': '7 days', '30d': '30 days'}
        if time_range in range_map:
            where_clauses.append(f"a.created_at >= NOW() - INTERVAL '{range_map[time_range]}'")
        elif time_range == 'custom':
            if time_from:
                where_clauses.append("a.created_at >= :time_from")
                params["time_from"] = time_from
            if time_to:
                where_clauses.append("a.created_at <= :time_to")
                params["time_to"] = time_to

        where_sql = " WHERE " + " AND ".join(where_clauses)

        total = db.execute(text(
            f"SELECT COUNT(*) FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id{where_sql}"
        ), params).fetchone()[0]

        rows = db.execute(text(f"""
            SELECT a.id, a.user_email, a.action, a.resource_type, a.resource_id,
                   a.details, a.ip_address, a.created_at, u.full_name
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            {where_sql}
            ORDER BY a.created_at DESC
            LIMIT :limit OFFSET :offset
        """), params).fetchall()

        actions = [r[0] for r in db.execute(text(
            "SELECT DISTINCT action FROM audit_logs WHERE created_at >= NOW() - INTERVAL '30 days' ORDER BY action"
        )).fetchall()]

        return jsonify({
            "total": total,
            "page": page,
            "per_page": per_page,
            "filters": {"actions": actions},
            "logs": [{
                "id": str(r[0]),
                "user_email": r[1],
                "action": r[2],
                "resource_type": r[3],
                "resource_id": r[4],
                "details": r[5],
                "ip_address": r[6],
                "created_at": r[7].isoformat() if r[7] else None,
                "user_name": r[8],
            } for r in rows]
        })
    finally:
        db.close()

@admin_bp.route('/api/admin/system-prompt', methods=['GET'])
@admin_required
def get_system_prompt():
    from backend.services.rag_service import DEFAULT_SYSTEM_PROMPT
    db = SessionLocal()
    try:
        row = db.execute(text("""
            SELECT value, updated_at FROM system_config WHERE key = 'system_prompt'
        """)).fetchone()

        return jsonify({
            "prompt": row[0] if row else DEFAULT_SYSTEM_PROMPT,
            "updated_at": row[1].isoformat() if row and row[1] else None,
            "is_default": row is None,
        })
    finally:
        db.close()

@admin_bp.route('/api/admin/system-prompt', methods=['PUT'])
@super_admin_required
def update_system_prompt():
    data = request.get_json()
    prompt = data.get('prompt', '').strip()
    admin_id = get_jwt_identity()

    if not prompt:
        return jsonify({"error": "Prompt cannot be empty"}), 400

    db = SessionLocal()
    try:
        existing = db.execute(text(
            "SELECT id FROM system_config WHERE key = 'system_prompt'"
        )).fetchone()

        if existing:
            db.execute(text("""
                UPDATE system_config SET value = :value, updated_by = :updated_by, updated_at = :now
                WHERE key = 'system_prompt'
            """), {"value": prompt, "updated_by": admin_id, "now": datetime.utcnow()})
        else:
            db.execute(text("""
                INSERT INTO system_config (key, value, updated_by) VALUES ('system_prompt', :value, :updated_by)
            """), {"value": prompt, "updated_by": admin_id})

        db.commit()
        log_audit(admin_id, None, "system_prompt_updated", "system_config", "system_prompt", f"Batch/RFP system prompt updated ({len(prompt)} chars)")

        return jsonify({"message": "System prompt updated"})
    except Exception as e:
        db.rollback()
        return jsonify({"error": "An error occurred. Please try again."}), 500
    finally:
        db.close()

@admin_bp.route('/api/admin/chat-system-prompt', methods=['GET'])
@admin_required
def get_chat_system_prompt():
    from backend.services.rag_service import DEFAULT_CHAT_SYSTEM_PROMPT
    db = SessionLocal()
    try:
        row = db.execute(text("""
            SELECT value, updated_at FROM system_config WHERE key = 'chat_system_prompt'
        """)).fetchone()

        return jsonify({
            "prompt": row[0] if row else DEFAULT_CHAT_SYSTEM_PROMPT,
            "updated_at": row[1].isoformat() if row and row[1] else None,
            "is_default": row is None,
        })
    finally:
        db.close()

@admin_bp.route('/api/admin/chat-system-prompt', methods=['PUT'])
@super_admin_required
def update_chat_system_prompt():
    data = request.get_json()
    prompt = data.get('prompt', '').strip()
    admin_id = get_jwt_identity()

    if not prompt:
        return jsonify({"error": "Prompt cannot be empty"}), 400

    db = SessionLocal()
    try:
        existing = db.execute(text(
            "SELECT id FROM system_config WHERE key = 'chat_system_prompt'"
        )).fetchone()

        if existing:
            db.execute(text("""
                UPDATE system_config SET value = :value, updated_by = :updated_by, updated_at = :now
                WHERE key = 'chat_system_prompt'
            """), {"value": prompt, "updated_by": admin_id, "now": datetime.utcnow()})
        else:
            db.execute(text("""
                INSERT INTO system_config (key, value, updated_by) VALUES ('chat_system_prompt', :value, :updated_by)
            """), {"value": prompt, "updated_by": admin_id})

        db.commit()
        log_audit(admin_id, None, "chat_system_prompt_updated", "system_config", "chat_system_prompt", f"Chat system prompt updated ({len(prompt)} chars)")

        return jsonify({"message": "Chat system prompt updated"})
    except Exception as e:
        db.rollback()
        return jsonify({"error": "An error occurred. Please try again."}), 500
    finally:
        db.close()

@admin_bp.route('/api/admin/knowledge-source/sync', methods=['POST'])
@admin_required
def sync_knowledge_source():
    admin_id = get_jwt_identity()
    profile = _profile_from_request()
    if not profile:
        return jsonify({"error": "Invalid repository profile"}), 400

    try:
        result = sync_sharepoint_documents(profile)
        log_audit(
            admin_id,
            None,
            "knowledge_source_synced",
            "sharepoint",
            None,
            f"[{result['label']}] Indexed {result['indexed_count']} of {result['total_files']} files from {result['config']['folder_path']}"
        )
        return jsonify({
            "message": f"Indexed {result['indexed_count']} of {result['total_files']} files from {result['label']}",
            **result,
        })
    except ValueError as e:
        return jsonify({"error": f"SharePoint sync failed: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"SharePoint sync failed: {str(e)}"}), 500

@admin_bp.route('/api/admin/sharepoint-config', methods=['GET'])
@admin_required
def get_sharepoint_settings():
    profile = request.args.get("profile")
    if profile:
        if profile not in SHAREPOINT_PROFILES:
            return jsonify({"error": "Invalid repository profile"}), 400
        return jsonify(get_sharepoint_config(profile))
    return jsonify(get_all_sharepoint_configs())

@admin_bp.route('/api/admin/sharepoint-config', methods=['PUT'])
@admin_required
def update_sharepoint_settings():
    data = request.get_json() or {}
    profile = data.get("profile", "knowledge")
    if profile not in SHAREPOINT_PROFILES:
        return jsonify({"error": "Invalid repository profile"}), 400

    config = {
        "repository_url": data.get("repository_url", "").strip(),
        "site_id": data.get("site_id", "").strip(),
        "drive_id": data.get("drive_id", "").strip(),
        "folder_path": data.get("folder_path", "").strip(),
    }

    if not config["repository_url"] and (not config["site_id"] or not config["drive_id"] or not config["folder_path"]):
        return jsonify({"error": "Provide a SharePoint repository URL or all resolved fields"}), 400

    try:
        save_sharepoint_config(config, profile)
        resolved = get_sharepoint_config(profile)
    except Exception as e:
        partial = get_sharepoint_config(profile)
        return jsonify({
            "message": f"Repository URL was saved. Automatic SharePoint resolution was skipped: {str(e)}",
            "warning": True,
            **partial,
        })

    log_audit(get_jwt_identity(), None, "sharepoint_config_updated", "sharepoint", None, f"[{resolved['label']}] Folder: {resolved['folder_path']}")
    return jsonify({"message": "SharePoint configuration updated", **resolved})

@admin_bp.route('/api/admin/knowledge-source/documents', methods=['GET'])
@admin_required
def list_documents():
    profile = request.args.get("profile")
    where_clause = ""
    params = {}
    if profile:
        if profile not in SHAREPOINT_PROFILES:
            return jsonify({"error": "Invalid repository profile"}), 400
        config = get_sharepoint_config(profile)
        where_clause = """
            WHERE d.repository_key = :repository_key
              AND COALESCE(d.site_id, '') = :site_id
              AND COALESCE(d.drive_id, '') = :drive_id
              AND COALESCE(d.path, '') = :path
        """
        params = {
            "repository_key": profile,
            "site_id": config.get("site_id", ""),
            "drive_id": config.get("drive_id", ""),
            "path": config.get("folder_path", ""),
        }

    db = SessionLocal()
    try:
        rows = db.execute(text(f"""
            SELECT d.id, d.repository_key, d.document_type, d.name, d.web_url, d.last_modified, d.is_deleted, d.path,
                   d.source_file_id, d.etag, d.processed_at,
                   (SELECT COUNT(*) FROM sections WHERE document_id = d.id) as section_count
            FROM documents d
            {where_clause}
            ORDER BY d.repository_key, d.last_modified DESC
        """), params).fetchall()

        return jsonify([{
            "id": str(r[0]),
            "repository_key": r[1],
            "document_type": r[2],
            "name": r[3],
            "web_url": r[4],
            "last_modified": r[5].isoformat() if r[5] else None,
            "is_deleted": r[6],
            "path": r[7],
            "processed": bool(r[10] or (r[11] or 0) > 0),
            "source_file_id": r[8],
            "etag": r[9],
            "processed_at": r[10].isoformat() if r[10] else None,
            "section_count": r[11],
            "status": "deleted" if r[6] else ("indexed" if r[10] or (r[11] or 0) > 0 else "synced_only"),
        } for r in rows])
    finally:
        db.close()

@admin_bp.route('/api/admin/quality', methods=['GET'])
@admin_required
def quality_metrics():
    db = SessionLocal()
    try:
        summary = db.execute(text("""
            SELECT
                COUNT(*) FILTER (WHERE status IN ('answered', 'accepted')) AS answered_count,
                COUNT(*) FILTER (WHERE status = 'accepted') AS accepted_count,
                COUNT(*) FILTER (WHERE status = 'error') AS error_count,
                COUNT(*) FILTER (WHERE cached = true) AS cached_count,
                COUNT(*) FILTER (WHERE COALESCE(jsonb_array_length(sources), 0) > 0) AS sourced_count,
                AVG(NULLIF(latency_ms, 0)) AS avg_latency_ms
            FROM batch_questions
        """)).mappings().fetchone()

        jobs = db.execute(text("""
            SELECT
                bj.id,
                bj.original_filename,
                bj.status,
                bj.total_questions,
                bj.processed_count,
                bj.accepted_count,
                bj.cached_count,
                bj.error_count,
                bj.started_at,
                bj.completed_at,
                u.email AS user_email
            FROM batch_jobs bj
            LEFT JOIN users u ON bj.user_id = u.id
            ORDER BY bj.created_at DESC
            LIMIT 25
        """)).mappings().all()

        index_stats = db.execute(text("""
            SELECT
                COUNT(*) FILTER (WHERE is_deleted = false) AS active_documents,
                COUNT(*) FILTER (WHERE processed_at IS NOT NULL) AS indexed_documents,
                COUNT(*) AS total_documents,
                (SELECT COUNT(*) FROM sections) AS total_sections,
                (SELECT COUNT(*) FROM answer_cache) AS cached_answers
            FROM documents
        """)).mappings().fetchone()

        answered_count = summary["answered_count"] or 0
        acceptance_rate = (summary["accepted_count"] or 0) / answered_count if answered_count else 0
        sourced_rate = (summary["sourced_count"] or 0) / answered_count if answered_count else 0
        cache_hit_rate = (summary["cached_count"] or 0) / answered_count if answered_count else 0

        return jsonify({
            "retrieval_mode": "vectorless_fulltext_pageindex_sections",
            "metrics": {
                "answered_count": answered_count,
                "accepted_count": summary["accepted_count"] or 0,
                "error_count": summary["error_count"] or 0,
                "cached_count": summary["cached_count"] or 0,
                "sourced_count": summary["sourced_count"] or 0,
                "avg_latency_ms": int(summary["avg_latency_ms"] or 0),
                "acceptance_rate": round(acceptance_rate, 4),
                "sourced_rate": round(sourced_rate, 4),
                "cache_hit_rate": round(cache_hit_rate, 4),
            },
            "index": {
                "total_documents": index_stats["total_documents"] or 0,
                "active_documents": index_stats["active_documents"] or 0,
                "indexed_documents": index_stats["indexed_documents"] or 0,
                "total_sections": index_stats["total_sections"] or 0,
                "cached_answers": index_stats["cached_answers"] or 0,
            },
            "recent_jobs": [{
                "id": str(row["id"]),
                "filename": row["original_filename"],
                "status": row["status"],
                "total_questions": row["total_questions"],
                "processed_count": row["processed_count"],
                "accepted_count": row["accepted_count"],
                "cached_count": row["cached_count"] or 0,
                "error_count": row["error_count"] or 0,
                "started_at": row["started_at"].isoformat() if row["started_at"] else None,
                "completed_at": row["completed_at"].isoformat() if row["completed_at"] else None,
                "user_email": row["user_email"],
            } for row in jobs],
        })
    finally:
        db.close()

@admin_bp.route('/api/admin/stats', methods=['GET'])
@admin_required
def admin_stats():
    db = SessionLocal()
    try:
        users_count = db.execute(text("SELECT COUNT(*) FROM users")).fetchone()[0]
        active_users = db.execute(text("SELECT COUNT(*) FROM users WHERE is_active = true")).fetchone()[0]
        conversations_count = db.execute(text("SELECT COUNT(*) FROM conversations")).fetchone()[0]
        messages_count = db.execute(text("SELECT COUNT(*) FROM messages")).fetchone()[0]
        documents_count = db.execute(text("SELECT COUNT(*) FROM documents WHERE is_deleted = false")).fetchone()[0]
        sections_count = db.execute(text("SELECT COUNT(*) FROM sections")).fetchone()[0]

        return jsonify({
            "total_users": users_count,
            "active_users": active_users,
            "total_conversations": conversations_count,
            "total_messages": messages_count,
            "total_documents": documents_count,
            "total_sections": sections_count,
        })
    finally:
        db.close()
