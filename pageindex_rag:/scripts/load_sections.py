# scripts/load_sections.py

from pathlib import Path
from sqlalchemy import text
from db.session import SessionLocal
from db.repo import insert_sections
from pageindex.parse_markdown import parse_markdown

db = SessionLocal()
doc = db.execute(text("SELECT id FROM documents LIMIT 1")).fetchone()
db.close()

document_id = doc[0]

md = Path("data/markdown/RFP Repository - All Topics.md").read_text()

sections = parse_markdown(md)

print(f"Loading {len(sections)} sections...")
insert_sections(document_id, sections)
print("DONE")