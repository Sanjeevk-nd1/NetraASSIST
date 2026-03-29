from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import text
import uuid
import json
import os
from datetime import datetime

from backend.database import SessionLocal
from backend.services.rag_service import chat_answer_question, has_indexed_documents
from backend.api.auth import log_audit

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/api/conversations', methods=['GET'])
@jwt_required()
def list_conversations():
    user_id = get_jwt_identity()
    db = SessionLocal()
    try:
        rows = db.execute(text("""
            SELECT c.id, c.title, c.created_at, c.updated_at,
                   (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as msg_count
            FROM conversations c
            WHERE c.user_id = :user_id
            ORDER BY c.updated_at DESC
        """), {"user_id": user_id}).fetchall()

        return jsonify([{
            "id": str(r[0]),
            "title": r[1],
            "created_at": r[2].isoformat() if r[2] else None,
            "updated_at": r[3].isoformat() if r[3] else None,
            "message_count": r[4],
        } for r in rows])
    finally:
        db.close()

@chat_bp.route('/api/conversations', methods=['POST'])
@jwt_required()
def create_conversation():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    title = data.get('title', 'New Conversation')

    db = SessionLocal()
    try:
        conv_id = str(uuid.uuid4())
        db.execute(text("""
            INSERT INTO conversations (id, user_id, title)
            VALUES (:id, :user_id, :title)
        """), {"id": conv_id, "user_id": user_id, "title": title})
        db.commit()

        return jsonify({"id": conv_id, "title": title}), 201
    except Exception as e:
        db.rollback()
        return jsonify({"error": "An error occurred. Please try again."}), 500
    finally:
        db.close()

@chat_bp.route('/api/conversations/<conv_id>', methods=['DELETE'])
@jwt_required()
def delete_conversation(conv_id):
    user_id = get_jwt_identity()
    db = SessionLocal()
    try:
        db.execute(text("""
            DELETE FROM conversations WHERE id = :id AND user_id = :user_id
        """), {"id": conv_id, "user_id": user_id})
        db.commit()
        return jsonify({"message": "Conversation deleted"})
    except Exception as e:
        db.rollback()
        return jsonify({"error": "An error occurred. Please try again."}), 500
    finally:
        db.close()

@chat_bp.route('/api/conversations/<conv_id>/messages', methods=['GET'])
@jwt_required()
def get_messages(conv_id):
    user_id = get_jwt_identity()
    db = SessionLocal()
    try:
        conv = db.execute(text("""
            SELECT id FROM conversations WHERE id = :id AND user_id = :user_id
        """), {"id": conv_id, "user_id": user_id}).fetchone()

        if not conv:
            return jsonify({"error": "Conversation not found"}), 404

        rows = db.execute(text("""
            SELECT id, role, content, created_at
            FROM messages
            WHERE conversation_id = :conv_id
            ORDER BY created_at ASC
        """), {"conv_id": conv_id}).fetchall()

        return jsonify([{
            "id": str(r[0]),
            "role": r[1],
            "content": r[2],
            "created_at": r[3].isoformat() if r[3] else None,
        } for r in rows])
    finally:
        db.close()

@chat_bp.route('/api/chat', methods=['POST'])
@jwt_required()
def chat():
    user_id = get_jwt_identity()
    data = request.get_json()
    question = data.get('message', '').strip()
    conv_id = data.get('conversation_id')

    if not question:
        return jsonify({"error": "Message is required"}), 400

    db = SessionLocal()
    try:
        if not conv_id:
            conv_id = str(uuid.uuid4())
            title = question[:80] + ('...' if len(question) > 80 else '')
            db.execute(text("""
                INSERT INTO conversations (id, user_id, title)
                VALUES (:id, :user_id, :title)
            """), {"id": conv_id, "user_id": user_id, "title": title})
            db.commit()
        else:
            conv = db.execute(text("""
                SELECT id FROM conversations WHERE id = :id AND user_id = :user_id
            """), {"id": conv_id, "user_id": user_id}).fetchone()
            if not conv:
                return jsonify({"error": "Conversation not found"}), 404

        msg_id = str(uuid.uuid4())
        db.execute(text("""
            INSERT INTO messages (id, conversation_id, role, content)
            VALUES (:id, :conv_id, 'user', :content)
        """), {"id": msg_id, "conv_id": conv_id, "content": question})
        db.commit()

        history_rows = db.execute(text("""
            SELECT role, content FROM messages
            WHERE conversation_id = :conv_id
            ORDER BY created_at ASC
        """), {"conv_id": conv_id}).fetchall()

        conversation_history = [{"role": r[0], "content": r[1]} for r in history_rows[:-1]]

        try:
            answer = chat_answer_question(question, conversation_history)
            if not has_indexed_documents():
                answer = "**⚠️ No knowledge base documents are indexed.** Responses are based on general AI knowledge only, not your organization's data. Please configure SharePoint sync in the Admin panel.\n\n---\n\n" + answer
        except Exception as e:
            answer = f"I apologize, but I encountered an error processing your question. Please try again. Error: {str(e)}"

        assistant_msg_id = str(uuid.uuid4())
        db.execute(text("""
            INSERT INTO messages (id, conversation_id, role, content)
            VALUES (:id, :conv_id, 'assistant', :content)
        """), {"id": assistant_msg_id, "conv_id": conv_id, "content": answer})

        db.execute(text("""
            UPDATE conversations SET updated_at = :now WHERE id = :id
        """), {"now": datetime.utcnow(), "id": conv_id})
        db.commit()

        log_audit(user_id, None, "chat_message", "conversation", conv_id, f"Question: {question[:200]}")

        return jsonify({
            "conversation_id": conv_id,
            "message": {
                "id": assistant_msg_id,
                "role": "assistant",
                "content": answer,
                "created_at": datetime.utcnow().isoformat(),
            }
        })

    except Exception as e:
        db.rollback()
        return jsonify({"error": "An error occurred. Please try again."}), 500
    finally:
        db.close()

@chat_bp.route('/api/conversations/<conv_id>/export', methods=['POST'])
@jwt_required()
def export_conversation(conv_id):
    user_id = get_jwt_identity()
    db = SessionLocal()
    try:
        conv = db.execute(text("""
            SELECT id, title FROM conversations WHERE id = :id AND user_id = :user_id
        """), {"id": conv_id, "user_id": user_id}).fetchone()

        if not conv:
            return jsonify({"error": "Conversation not found"}), 404

        messages = db.execute(text("""
            SELECT role, content, created_at FROM messages
            WHERE conversation_id = :conv_id ORDER BY created_at ASC
        """), {"conv_id": conv_id}).fetchall()

        import re
        export_content = f"# {conv[1]}\n\nExported: {datetime.utcnow().isoformat()}\n\n"
        for msg in messages:
            role_label = "You" if msg[0] == "user" else "NetraAssist"
            export_content += f"### {role_label} ({msg[2].strftime('%Y-%m-%d %H:%M') if msg[2] else ''})\n\n{msg[1]}\n\n---\n\n"

        downloads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'downloads')
        os.makedirs(downloads_dir, exist_ok=True)

        safe_title = re.sub(r'[^a-zA-Z0-9_\- ]', '', conv[1][:30]).replace(' ', '_')
        filename = f"chat_{safe_title}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.md"
        filepath = os.path.realpath(os.path.join(downloads_dir, filename))
        if not filepath.startswith(os.path.realpath(downloads_dir)):
            return jsonify({"error": "Invalid filename"}), 400

        with open(filepath, 'w') as f:
            f.write(export_content)

        file_size = os.path.getsize(filepath)
        download_id = str(uuid.uuid4())
        db.execute(text("""
            INSERT INTO downloads (id, user_id, filename, file_type, file_path, file_size)
            VALUES (:id, :user_id, :filename, 'chat_export', :file_path, :file_size)
        """), {
            "id": download_id, "user_id": user_id,
            "filename": filename, "file_path": filepath, "file_size": file_size
        })
        db.commit()

        log_audit(user_id, None, "chat_exported", "conversation", conv_id, f"Exported as {filename}")

        return jsonify({"download_id": download_id, "filename": filename})
    except Exception as e:
        db.rollback()
        return jsonify({"error": "An error occurred. Please try again."}), 500
    finally:
        db.close()
