from pathlib import Path
import re

md_path = Path("data/markdown/RFP Repository - All Topics.md")
md = md_path.read_text(encoding="utf-8")

lines = md.splitlines()

# Checks
sheet_headers = [l for l in lines if l.startswith("# Sheet:")]
tables = [i for i, l in enumerate(lines) if l.startswith("|")]

print(f"Sheets found: {len(sheet_headers)}")
print(f"Table rows found: {len(tables)}")

# Heading depth check
bad_headings = [l for l in lines if l.startswith("####")]
if bad_headings:
    print("⚠️ Deep headings found (####). Consider flattening.")
else:
    print("✅ Heading depth OK")

# Empty table rows
empty_rows = [l for l in lines if l.strip() == "|  |"]
if empty_rows:
    print("⚠️ Empty table rows found")
else:
    print("✅ No empty table rows")

print("✅ Validation complete")