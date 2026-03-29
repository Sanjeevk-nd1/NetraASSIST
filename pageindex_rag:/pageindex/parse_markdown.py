# pageindex/parse_markdown.py

import re
import uuid
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class Section:
    id: str
    title: str
    level: int
    content: str
    parent_id: Optional[str]


def parse_markdown(md: str) -> List[Section]:
    lines = md.splitlines()

    sections: List[Section] = []
    stack: List[Section] = []
    buffer = []

    def flush():
        if stack:
            stack[-1].content = "\n".join(buffer).strip()

    for line in lines:
        m = re.match(r"^(#{1,6})\s+(.*)", line)
        if m:
            flush()
            buffer.clear()

            level = len(m.group(1))
            title = m.group(2)

            while stack and stack[-1].level >= level:
                stack.pop()

            parent_id = stack[-1].id if stack else None

            sec = Section(
                id=str(uuid.uuid4()),
                title=title,
                level=level,
                content="",
                parent_id=parent_id,
            )

            sections.append(sec)
            stack.append(sec)
        else:
            buffer.append(line)

    flush()
    return sections