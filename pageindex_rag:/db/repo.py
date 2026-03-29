from sqlalchemy import text
from db.session import SessionLocal
from datetime import datetime

def upsert_document(doc):
    sql = text("""
    INSERT INTO documents
    (source_file_id, name, web_url, etag, last_modified, drive_id, site_id, path, is_deleted)
    VALUES
    (:source_file_id, :name, :web_url, :etag, :last_modified,
     :drive_id, :site_id, :path, false)
    ON CONFLICT (source_file_id) DO UPDATE SET
      name = EXCLUDED.name,
      web_url = EXCLUDED.web_url,
      etag = EXCLUDED.etag,
      last_modified = EXCLUDED.last_modified,
      path = EXCLUDED.path,
      is_deleted = false;
    """)

    db = SessionLocal()
    try:
        db.execute(sql, doc)
        db.commit()
    finally:
        db.close()


def mark_deleted(source_file_id: str):
    """
    Marks a SharePoint document as deleted using its DriveItem ID
    """
    sql = text("""
    UPDATE documents
    SET is_deleted = true
    WHERE source_file_id = :source_file_id;
    """)
    db = SessionLocal()
    try:
        db.execute(sql, {"source_file_id": source_file_id})
        db.commit()
    finally:
        db.close()

def insert_sections(document_id, sections):
    sql = text("""
    INSERT INTO sections
    (id, document_id, parent_id, title, level, content)
    VALUES
    (:id, :document_id, :parent_id, :title, :level, :content)
    """)

    db = SessionLocal()
    try:
        for s in sections:
            db.execute(sql, {
                "id": s.id,
                "document_id": document_id,
                "parent_id": s.parent_id,
                "title": s.title,
                "level": s.level,
                "content": s.content,
            })
        db.commit()
    finally:
        db.close()