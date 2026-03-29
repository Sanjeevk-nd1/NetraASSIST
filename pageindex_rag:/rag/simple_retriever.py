from sqlalchemy import text
from db.session import SessionLocal


def search_sections(keyword: str, limit=5):
    db = SessionLocal()
    rows = db.execute(text("""
        SELECT title, content
        FROM sections
        WHERE content ILIKE :q
        LIMIT :limit
    """), {
        "q": f"%{keyword}%",
        "limit": limit
    }).fetchall()
    db.close()
    return rows