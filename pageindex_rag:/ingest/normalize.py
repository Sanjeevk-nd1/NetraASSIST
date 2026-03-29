import re


def normalize_markdown(md: str) -> str:
    """
    Normalize markdown so it is stable for PageIndex parsing.
    - Remove extra blank lines
    - Preserve heading hierarchy
    """

    lines = md.splitlines()
    out = []

    for line in lines:
        line = line.rstrip()

        if not line:
            continue

        # Keep headings and text as-is
        out.append(line)

    return "\n".join(out)