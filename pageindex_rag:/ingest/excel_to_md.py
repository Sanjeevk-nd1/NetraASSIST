import pandas as pd
from pathlib import Path


TITLE_CANDIDATES = (
    "question",
    "questions",
    "requirement",
    "requirements",
    "topic",
    "control",
    "title",
    "prompt",
    "name",
)


def _clean_value(value):
    if pd.isna(value):
        return ""
    text = str(value).strip()
    if text.lower() == "nan":
        return ""
    return " ".join(text.split())


def _row_pairs(row, columns):
    pairs = []
    for column, value in zip(columns, row):
        label = _clean_value(column)
        content = _clean_value(value)
        if not label or not content:
            continue
        pairs.append((label, content))
    return pairs


def _infer_row_title(pairs, row_number):
    lowered = {label.lower(): value for label, value in pairs}
    for candidate in TITLE_CANDIDATES:
        if candidate in lowered and lowered[candidate]:
            return lowered[candidate]

    if pairs:
        return pairs[0][1][:140]

    return f"Row {row_number}"


def excel_to_markdown(path: str) -> str:
    xls = pd.ExcelFile(path)
    md = []
    workbook_name = Path(path).stem

    md.append(f"# Workbook: {workbook_name}")

    for sheet in xls.sheet_names:
        df = xls.parse(sheet)
        df = df.dropna(how="all")
        columns = [str(column) for column in df.columns]

        md.append(f"## Sheet: {sheet}")

        if df.empty:
            md.append("_Empty sheet_")
            continue

        md.append(f"_Columns: {', '.join(columns)}_")

        for row_index, (_, row) in enumerate(df.iterrows(), start=1):
            pairs = _row_pairs(row.values, columns)
            if not pairs:
                continue

            row_title = _infer_row_title(pairs, row_index)
            md.append(f"### Row {row_index}: {row_title}")

            for label, value in pairs:
                md.append(f"- **{label}**: {value}")

    return "\n\n".join(md)


def convert_file(src: str, out_dir: str):
    md = excel_to_markdown(src)
    out = Path(out_dir) / (Path(src).stem + ".md")
    out.write_text(md, encoding="utf-8")
    return out
