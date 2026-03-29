from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy import text

from backend.database import SessionLocal

downloads_bp = Blueprint('downloads', __name__)

@downloads_bp.route('/api/downloads', methods=['GET'])
@jwt_required()
def list_downloads():
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get('role', 'user')

    db = SessionLocal()
    try:
        if role == 'admin' and request.args.get('all') == 'true':
            rows = db.execute(text("""
                SELECT d.id, d.filename, d.file_type, d.file_size, d.created_at,
                       u.email, u.full_name
                FROM downloads d
                LEFT JOIN users u ON d.user_id = u.id
                ORDER BY d.created_at DESC
                LIMIT 200
            """)).fetchall()
        else:
            rows = db.execute(text("""
                SELECT d.id, d.filename, d.file_type, d.file_size, d.created_at,
                       NULL as email, NULL as full_name
                FROM downloads d
                WHERE d.user_id = :user_id
                ORDER BY d.created_at DESC
                LIMIT 100
            """), {"user_id": user_id}).fetchall()

        return jsonify([{
            "id": str(r[0]),
            "filename": r[1],
            "file_type": r[2],
            "file_size": r[3],
            "created_at": r[4].isoformat() if r[4] else None,
            "user_email": r[5],
            "user_name": r[6],
        } for r in rows])
    finally:
        db.close()

@downloads_bp.route('/api/downloads/<download_id>', methods=['GET'])
@jwt_required()
def download_file(download_id):
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get('role', 'user')

    db = SessionLocal()
    try:
        if role == 'admin':
            row = db.execute(text("""
                SELECT file_path, filename FROM downloads WHERE id = :id
            """), {"id": download_id}).fetchone()
        else:
            row = db.execute(text("""
                SELECT file_path, filename FROM downloads WHERE id = :id AND user_id = :user_id
            """), {"id": download_id, "user_id": user_id}).fetchone()

        if not row:
            return jsonify({"error": "File not found"}), 404

        return send_file(row[0], as_attachment=True, download_name=row[1])
    finally:
        db.close()

@downloads_bp.route('/api/downloads/<download_id>', methods=['DELETE'])
@jwt_required()
def delete_download(download_id):
    user_id = get_jwt_identity()
    db = SessionLocal()
    try:
        import os
        row = db.execute(text("""
            SELECT file_path FROM downloads WHERE id = :id AND user_id = :user_id
        """), {"id": download_id, "user_id": user_id}).fetchone()

        if row and row[0] and os.path.exists(row[0]):
            os.remove(row[0])

        db.execute(text("""
            DELETE FROM downloads WHERE id = :id AND user_id = :user_id
        """), {"id": download_id, "user_id": user_id})
        db.commit()

        return jsonify({"message": "Download deleted"})
    except Exception as e:
        db.rollback()
        return jsonify({"error": "An error occurred. Please try again."}), 500
    finally:
        db.close()
