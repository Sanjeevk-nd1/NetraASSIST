import logging
import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from sqlalchemy import text
from datetime import datetime
import bcrypt
import uuid

from backend.database import SessionLocal

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

# ── Rate limiting for login ─────────────────────────────────────────────
_LOGIN_ATTEMPTS = {}  # {ip: [(timestamp, ...], ...}
_LOGIN_MAX_ATTEMPTS = 10
_LOGIN_WINDOW_SECONDS = 300  # 5 minutes

def _check_rate_limit(ip):
    """Return True if rate-limited."""
    now = datetime.utcnow().timestamp()
    attempts = _LOGIN_ATTEMPTS.get(ip, [])
    attempts = [t for t in attempts if now - t < _LOGIN_WINDOW_SECONDS]
    _LOGIN_ATTEMPTS[ip] = attempts
    if len(attempts) >= _LOGIN_MAX_ATTEMPTS:
        return True
    attempts.append(now)
    _LOGIN_ATTEMPTS[ip] = attempts
    return False

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
    # Registration disabled — all users should sign in via Microsoft SSO
    return jsonify({"error": "Registration is disabled. Please sign in with Microsoft."}), 403


def _register_legacy():
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
    if _check_rate_limit(request.remote_addr or '0.0.0.0'):
        return jsonify({"error": "Too many login attempts. Please try again in a few minutes."}), 429

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


# ── Microsoft SSO ────────────────────────────────────────────────────────

# Cache Microsoft JWKS (public keys) to avoid fetching on every request
_MS_JWKS_CACHE = {"keys": None, "fetched_at": 0}
_MS_JWKS_TTL = 3600  # 1 hour

def _get_ms_signing_keys():
    """Fetch Microsoft's public signing keys (JWKS) for token verification."""
    import time
    now = time.time()
    if _MS_JWKS_CACHE["keys"] and (now - _MS_JWKS_CACHE["fetched_at"]) < _MS_JWKS_TTL:
        return _MS_JWKS_CACHE["keys"]

    import requests as http_requests
    tenant_id = os.environ.get("MS_SSO_TENANT_ID") or os.environ.get("AZURE_TENANT_ID", "")
    jwks_url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
    resp = http_requests.get(jwks_url, timeout=10)
    resp.raise_for_status()
    keys = resp.json().get("keys", [])
    _MS_JWKS_CACHE["keys"] = keys
    _MS_JWKS_CACHE["fetched_at"] = now
    return keys


def _verify_ms_token(token_str):
    """Verify a Microsoft ID token and return its claims."""
    import jwt as pyjwt
    from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers
    from cryptography.hazmat.backends import default_backend
    import base64

    def _b64_to_int(b):
        b += '=' * (4 - len(b) % 4)
        return int.from_bytes(base64.urlsafe_b64decode(b), 'big')

    # Decode header to find the key ID (kid)
    header = pyjwt.get_unverified_header(token_str)
    kid = header.get("kid")
    if not kid:
        raise ValueError("Token missing key ID (kid)")

    # Find matching key from Microsoft's JWKS
    keys = _get_ms_signing_keys()
    key_data = next((k for k in keys if k.get("kid") == kid), None)
    if not key_data:
        # Refresh cache and retry once
        _MS_JWKS_CACHE["keys"] = None
        keys = _get_ms_signing_keys()
        key_data = next((k for k in keys if k.get("kid") == kid), None)
        if not key_data:
            raise ValueError("Token signing key not found in Microsoft JWKS")

    # Build RSA public key from JWK
    n = _b64_to_int(key_data["n"])
    e = _b64_to_int(key_data["e"])
    pub_key = RSAPublicNumbers(e, n).public_key(default_backend())

    tenant_id = os.environ.get("MS_SSO_TENANT_ID") or os.environ.get("AZURE_TENANT_ID", "")
    client_id = os.environ.get("MS_SSO_CLIENT_ID", "")

    # Verify and decode the token
    claims = pyjwt.decode(
        token_str,
        pub_key,
        algorithms=["RS256"],
        audience=client_id,
        issuer=f"https://login.microsoftonline.com/{tenant_id}/v2.0",
        options={"require": ["exp", "iss", "aud", "sub"]},
    )
    return claims


@auth_bp.route('/api/auth/sso', methods=['POST'])
def sso_login():
    """Authenticate user via Microsoft SSO ID token."""
    data = request.get_json()
    if not data or not data.get('token'):
        return jsonify({"error": "Microsoft token is required"}), 400

    ms_sso_enabled = os.environ.get("MS_SSO_ENABLED", "true").lower() == "true"
    if not ms_sso_enabled:
        return jsonify({"error": "SSO is not enabled"}), 403

    try:
        claims = _verify_ms_token(data['token'])
    except Exception as exc:
        logger.warning("SSO token verification failed: %s", exc)
        return jsonify({"error": "Invalid Microsoft token. Please try again."}), 401

    email = (claims.get('preferred_username') or claims.get('email') or '').strip().lower()
    full_name = claims.get('name', '').strip()
    ms_oid = claims.get('oid', '')  # Microsoft Object ID — unique per user

    if not email:
        return jsonify({"error": "No email found in Microsoft token"}), 400

    # Restrict to company domain
    allowed_domains = ['netradyne.com']
    domain = email.split('@')[-1] if '@' in email else ''
    if domain not in allowed_domains:
        return jsonify({"error": f"Only @netradyne.com accounts are allowed"}), 403

    db = SessionLocal()
    try:
        user = db.execute(
            text("SELECT id, email, full_name, role, is_active FROM users WHERE LOWER(email) = :email LIMIT 1"),
            {"email": email}
        ).fetchone()

        if user:
            if not user[4]:
                return jsonify({"error": "Your account has been deactivated. Contact an admin."}), 403

            # Update name and login timestamp
            db.execute(text("""
                UPDATE users SET full_name = :name, last_login = :now WHERE id = :id
            """), {"name": full_name or user[2], "id": str(user[0]), "now": datetime.utcnow()})
            db.commit()

            user_id = str(user[0])
            role = user[3]
        else:
            # Auto-create user on first SSO login
            user_id = str(uuid.uuid4())
            # SSO users get a random password hash (can't be used for password login)
            random_hash = bcrypt.hashpw(uuid.uuid4().hex.encode(), bcrypt.gensalt()).decode()
            db.execute(text("""
                INSERT INTO users (id, email, password_hash, full_name, role, last_login)
                VALUES (:id, :email, :pw, :name, 'user', :now)
            """), {
                "id": user_id,
                "email": email,
                "pw": random_hash,
                "name": full_name or email.split('@')[0],
                "now": datetime.utcnow(),
            })
            db.commit()
            role = 'user'
            logger.info("SSO auto-created user: %s (%s)", email, user_id)

        log_audit(user_id, email, "sso_login", "user", user_id, f"SSO login: {full_name or email}")

        access_token = create_access_token(
            identity=user_id,
            additional_claims={"role": role, "email": email}
        )
        refresh_token = create_refresh_token(identity=user_id)

        return jsonify({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user_id,
                "email": email,
                "full_name": full_name or email.split('@')[0],
                "role": role,
            }
        })

    except Exception as e:
        db.rollback()
        logger.error("SSO login error: %s", e)
        return jsonify({"error": "SSO login failed. Please try again."}), 500
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
