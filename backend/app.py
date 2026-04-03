import os
import sys
import logging
import secrets

from dotenv import load_dotenv

root_env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(root_env_path):
    load_dotenv(root_env_path)

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, get_jwt, verify_jwt_in_request
from sqlalchemy import text

from backend.database import init_db, SessionLocal
from backend.config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Resolve frontend dist directory (works both locally and in Docker)
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'dist')

def create_app():
    app = Flask(__name__, static_folder=None)

    jwt_secret = os.environ.get('JWT_SECRET_KEY', '') or os.environ.get('JWT_SECRET', '')
    if not jwt_secret:
        jwt_secret = secrets.token_hex(32)
        logger.warning("JWT_SECRET_KEY not set, using generated secret (will change on restart)")

    app.config['SECRET_KEY'] = jwt_secret
    app.config['JWT_SECRET_KEY'] = jwt_secret
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = Config.JWT_ACCESS_TOKEN_EXPIRES
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = Config.JWT_REFRESH_TOKEN_EXPIRES

    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:3002",
        "https://netrassist.netradyne.info",
    ]
    CORS(app, resources={r"/api/*": {"origins": allowed_origins, "supports_credentials": True}})
    jwt = JWTManager(app)

    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        return response

    @app.before_request
    def check_user_active():
        from flask import request as req
        # Skip non-API paths (static files, frontend routes)
        if not req.path.startswith('/api/'):
            return
        if req.path in ('/api/auth/login', '/api/auth/register', '/api/auth/sso'):
            return
        try:
            verify_jwt_in_request(optional=True)
            claims = get_jwt()
            if claims:
                user_id = claims.get('sub')
                if user_id:
                    db = SessionLocal()
                    try:
                        row = db.execute(
                            text("SELECT is_active, role FROM users WHERE id = :id"),
                            {"id": user_id}
                        ).fetchone()
                        if not row:
                            return jsonify({"error": "Session expired", "force_logout": True}), 401
                        if not row[0]:
                            return jsonify({"error": "Session expired", "force_logout": True}), 401
                        # Inject current DB role into request for downstream use
                        req.current_user_role = row[1]
                    finally:
                        db.close()
        except Exception:
            pass

    from backend.api.auth import auth_bp
    from backend.api.chat import chat_bp
    from backend.api.downloads import downloads_bp
    from backend.api.admin import admin_bp
    from backend.api.docprocess import docprocess_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(downloads_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(docprocess_bp)

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        # Serve actual files (JS, CSS, images) from the built frontend
        if path and os.path.isfile(os.path.join(FRONTEND_DIST, path)):
            return send_from_directory(FRONTEND_DIST, path)
        # Everything else → index.html (React Router handles client-side routing)
        return send_from_directory(FRONTEND_DIST, 'index.html')

    init_db()
    logger.info("Database initialized successfully")
    _create_default_admin()
    _recover_stale_jobs()

    return app


def _recover_stale_jobs():
    """Reset jobs left in 'processing' or 'canceling' state from a previous crash."""
    db = SessionLocal()
    try:
        stale = db.execute(text("""
            SELECT id, original_filename, status FROM batch_jobs
            WHERE status IN ('processing', 'canceling')
        """)).fetchall()
        if not stale:
            return

        for row in stale:
            job_id, fname, status = row[0], row[1], row[2]
            if status == 'canceling':
                # Finalize as canceled
                db.execute(text("""
                    UPDATE batch_questions SET status = 'canceled', updated_at = NOW()
                    WHERE batch_id = :id AND status IN ('pending', 'processing')
                """), {"id": str(job_id)})
                db.execute(text("""
                    UPDATE batch_jobs SET status = 'canceled', completed_at = NOW(), updated_at = NOW()
                    WHERE id = :id
                """), {"id": str(job_id)})
                logger.info("Recovered stale canceling job: %s (%s) → canceled", fname, job_id)
            else:
                # Reset to uploaded so user can re-start
                db.execute(text("""
                    UPDATE batch_questions SET status = 'pending', updated_at = NOW()
                    WHERE batch_id = :id AND status = 'processing'
                """), {"id": str(job_id)})
                db.execute(text("""
                    UPDATE batch_jobs SET status = 'uploaded', cancel_requested = false,
                                         started_at = NULL, completed_at = NULL, updated_at = NOW()
                    WHERE id = :id
                """), {"id": str(job_id)})
                logger.info("Recovered stale processing job: %s (%s) → uploaded", fname, job_id)

        db.commit()
        # Flush stale tasks from Redis batch queue
        try:
            import redis
            r = redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
            flushed = r.delete("batch")
            if flushed:
                logger.info("Flushed %d stale tasks from Redis batch queue", flushed)
        except Exception:
            pass

        logger.info("Recovered %d stale batch jobs on startup", len(stale))
    except Exception as e:
        db.rollback()
        logger.error("Stale job recovery failed: %s", e)
    finally:
        db.close()

def _create_default_admin():
    import bcrypt

    admin_email = os.environ.get('PERMANENT_ADMIN_EMAIL', '').strip().lower()
    admin_pw = os.environ.get('ADMIN_DEFAULT_PASSWORD', '')

    db = SessionLocal()
    try:
        # Ensure super_admin role is allowed (migrates existing databases)
        db.execute(text("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check"))
        db.execute(text("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'super_admin'))"))
        db.commit()
    except Exception:
        db.rollback()

    if not admin_email or not admin_pw:
        logger.info("PERMANENT_ADMIN_EMAIL or ADMIN_DEFAULT_PASSWORD not set, skipping super admin seed.")
        db.close()
        return

    try:
        existing = db.execute(text("""
            SELECT id, password_hash
            FROM users
            WHERE LOWER(email) = :email
            LIMIT 1
        """), {"email": admin_email}).fetchone()

        if existing:
            # Always sync password from env so .env credentials are authoritative
            password_hash = bcrypt.hashpw(admin_pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            db.execute(text("""
                UPDATE users
                SET role = 'super_admin',
                    is_active = true,
                    full_name = 'Super Admin',
                    password_hash = :pw
                WHERE id = :id
            """), {"id": existing[0], "pw": password_hash})
            db.commit()
            logger.info("Super admin account verified.")
        else:
            password_hash = bcrypt.hashpw(admin_pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            db.execute(text("""
                INSERT INTO users (email, password_hash, full_name, role)
                VALUES (:email, :pw, 'Super Admin', 'super_admin')
            """), {"email": admin_email, "pw": password_hash})
            db.commit()
            logger.info("Super admin account created.")
    except Exception as e:
        db.rollback()
        logger.warning(f"Admin creation skipped: {e}")
    finally:
        db.close()

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=False)
