import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from sqlalchemy import text
from datetime import datetime
import bcrypt
import uuid

from backend.database import SessionLocal

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

def log_audit(user_id, user_email, action, resource_type=None, resource_id=None, details=None):
    db = SessionLocal()
    try:
        db.execute(text("""
            INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details, ip_address)
            VALUES (:user_id, :user_email, :action, :resource_type, :resource_id, :details, :ip_address)
        """), {
            "user_id": user_id,
            "user_email": user_email,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "details": details,
            "ip_address": request.remote_addr if request else None,
        })
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()

    if not email or not password or not full_name:
        return jsonify({"error": "All fields are required"}), 400

    if not email.endswith('@netradyne.com'):
        return jsonify({"error": "Only @netradyne.com email addresses are allowed"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

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
            VALUES (:id, :email, :password_hash, :full_name, 'user')
        """), {
            "id": user_id,
            "email": email,
            "password_hash": password_hash,
            "full_name": full_name,
        })
        db.commit()

        log_audit(user_id, email, "user_registered", "user", user_id, f"New user: {full_name} ({email})")

        access_token = create_access_token(identity=user_id, additional_claims={"role": "user", "email": email})
        refresh_token = create_refresh_token(identity=user_id)

        return jsonify({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {"id": user_id, "email": email, "full_name": full_name, "role": "user"}
        }), 201

    except Exception as e:
        db.rollback()
        logger.error(f"Registration error: {e}")
        return jsonify({"error": "Registration failed. Please try again."}), 500
    finally:
        db.close()

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request"}), 400
    identifier = data.get('email', '').strip()
    password = data.get('password', '')

    if not identifier or not password:
        return jsonify({"error": "Email/username and password are required"}), 400

    db = SessionLocal()
    try:
        # Try matching by email first, then by full_name (username)
        user = db.execute(
            text("SELECT id, email, password_hash, full_name, role, is_active FROM users WHERE LOWER(email) = :val OR LOWER(full_name) = :val LIMIT 1"),
            {"val": identifier.lower()}
        ).fetchone()

        if not user:
            return jsonify({"error": "Invalid credentials"}), 401

        if not user[5]:
            return jsonify({"error": "Invalid credentials"}), 401

        if not bcrypt.checkpw(password.encode('utf-8'), user[2].encode('utf-8')):
            return jsonify({"error": "Invalid credentials"}), 401

        db.execute(
            text("UPDATE users SET last_login = :now WHERE id = :id"),
            {"now": datetime.utcnow(), "id": str(user[0])}
        )
        db.commit()

        user_id = str(user[0])
        log_audit(user_id, user[1], "user_login", "user", user_id, f"Login as {user[3] or user[1]} (role: {user[4]})")

        access_token = create_access_token(
            identity=user_id,
            additional_claims={"role": user[4], "email": user[1]}
        )
        refresh_token = create_refresh_token(identity=user_id)

        return jsonify({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user_id,
                "email": user[1],
                "full_name": user[3],
                "role": user[4]
            }
        })

    except Exception as e:
        db.rollback()
        logger.error(f"Login error: {e}")
        return jsonify({"error": "Login failed. Please try again."}), 500
    finally:
        db.close()

@auth_bp.route('/api/auth/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    db = SessionLocal()
    try:
        user = db.execute(
            text("SELECT id, email, full_name, role, created_at, last_login, is_active FROM users WHERE id = :id"),
            {"id": user_id}
        ).fetchone()

        if not user or not user[6]:
            return jsonify({"error": "Session expired", "force_logout": True}), 401

        return jsonify({
            "id": str(user[0]),
            "email": user[1],
            "full_name": user[2],
            "role": user[3],
            "created_at": user[4].isoformat() if user[4] else None,
            "last_login": user[5].isoformat() if user[5] else None,
        })
    finally:
        db.close()

@auth_bp.route('/api/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    db = SessionLocal()
    try:
        user = db.execute(
            text("SELECT role, email, is_active FROM users WHERE id = :id"),
            {"id": user_id}
        ).fetchone()
        if not user or not user[2]:
            return jsonify({"error": "Session expired", "force_logout": True}), 401

        access_token = create_access_token(
            identity=user_id,
            additional_claims={"role": user[0], "email": user[1]}
        )
        return jsonify({"access_token": access_token})
    finally:
        db.close()

@auth_bp.route('/api/auth/change-password', methods=['PUT'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    data = request.get_json()
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    new_full_name = data.get('full_name', '').strip()

    # At least one change must be requested
    if not new_password and not new_full_name:
        return jsonify({"error": "Nothing to update"}), 400
    if new_password and len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400

    db = SessionLocal()
    try:
        user = db.execute(
            text("SELECT id, email, password_hash, role FROM users WHERE id = :id"),
            {"id": user_id}
        ).fetchone()

        if not user:
            return jsonify({"error": "User not found"}), 404

        if user[3] == 'super_admin':
            return jsonify({"error": "Super Admin profile cannot be changed from the UI"}), 403

        # Password change requires current password verification
        if new_password:
            if not current_password:
                return jsonify({"error": "Current password is required to change password"}), 400
            if not bcrypt.checkpw(current_password.encode('utf-8'), user[2].encode('utf-8')):
                return jsonify({"error": "Current password is incorrect"}), 401
            new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            db.execute(
                text("UPDATE users SET password_hash = :pw WHERE id = :id"),
                {"pw": new_hash, "id": user_id}
            )

        if new_full_name:
            db.execute(
                text("UPDATE users SET full_name = :name WHERE id = :id"),
                {"name": new_full_name, "id": user_id}
            )
        db.commit()

        details = []
        if new_password:
            details.append("password changed")
        if new_full_name:
            details.append(f"name changed to {new_full_name}")
        log_audit(user_id, user[1], "profile_updated", "user", user_id, ", ".join(details))

        return jsonify({"message": "Profile updated successfully"})
    except Exception as e:
        db.rollback()
        logger.error(f"Profile update error: {e}")
        return jsonify({"error": "Failed to update profile. Please try again."}), 500
    finally:
        db.close()
