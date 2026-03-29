import re
from pathlib import Path

import pymupdf


def _detect_heading_level(block_dict: dict, page_median_size: float) -> int:
    """Detect if a text block is a heading based on font size relative to page median.
    Returns 0 if not a heading, or 2-3 for heading level."""
    if not block_dict.get("lines"):
        return 0
    sizes = []
    is_bold = False
    for line in block_dict["lines"]:
        for span in line.get("spans", []):
            sizes.append(span["size"])
            if "bold" in span.get("font", "").lower():
                is_bold = True
    if not sizes:
        return 0
    avg_size = sum(sizes) / len(sizes)
    text = " ".join(
        span["text"].strip()
        for line in block_dict["lines"]
        for span in line.get("spans", [])
    ).strip()
    # Skip long paragraphs — headings are usually short
    if len(text) > 150 or not text:
        return 0
    # Skip lines ending with common non-heading punctuation
    if text.endswith((".",":",",")):
        return 0
    if avg_size >= page_median_size * 1.4:
        return 2
    if (avg_size >= page_median_size * 1.15 and is_bold) or (is_bold and len(text) <= 80):
        return 3
    return 0


def pdf_to_markdown(path: str) -> str:
    doc = pymupdf.open(path)
    title = Path(path).stem
    lines = [f"# {title}"]

    for page_num, page in enumerate(doc, start=1):
        # Get structured blocks with font info for heading detection
        page_dict = page.get_text("dict", sort=True)
        all_blocks = page_dict.get("blocks", [])

        # Compute median font size for this page
        all_sizes = []
        for block in all_blocks:
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    if span.get("text", "").strip():
                        all_sizes.append(span["size"])
        page_median_size = sorted(all_sizes)[len(all_sizes) // 2] if all_sizes else 12

        page_has_content = False
        for block in all_blocks:
            if block.get("type", 0) != 0:  # skip image blocks
                continue

            text = " ".join(
                span["text"]
                for line in block.get("lines", [])
                for span in line.get("spans", [])
            ).strip()
            if not text:
                continue
            text = re.sub(r"[ \t]+", " ", text)
            text = re.sub(r"\n{3,}", "\n\n", text)

            heading_level = _detect_heading_level(block, page_median_size)
            if heading_level > 0:
                lines.append(f"{'#' * heading_level} {text}")
            else:
                if not page_has_content:
                    # Add a page marker as a comment for context (not a heading)
                    lines.append(f"<!-- Page {page_num} -->")
                lines.append(text)
            page_has_content = True

    doc.close()
    return "\n\n".join(lines)


def convert_file(src: str, out_dir: str):
    md = pdf_to_markdown(src)
    out = Path(out_dir) / (Path(src).stem + ".md")
    out.write_text(md, encoding="utf-8")
    return out
