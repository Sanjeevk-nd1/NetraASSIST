"""
Comprehensive edge-case tests for the Excel question-parsing logic in
backend/api/docprocess.py.

Run:  python3 tests/test_docprocess_parser.py
Prints a clear PASS/FAIL line per test, exits 1 on any failure.
"""
import io
import os
import re
import sys
import types

# ── Stub out heavy imports so we can load the module standalone ──────────
for mod in ['backend.database', 'backend.api.auth',
            'backend.services.rag_service', 'flask_jwt_extended', 'flask']:
    sys.modules[mod] = types.ModuleType(mod)
sys.modules['backend.database'].SessionLocal = None
sys.modules['backend.api.auth'].log_audit = lambda *a, **k: None
sys.modules['backend.services.rag_service'].answer_question_with_sources = lambda *a, **k: None
sys.modules['flask_jwt_extended'].get_jwt_identity = lambda: None
sys.modules['flask_jwt_extended'].jwt_required = lambda *a, **k: (lambda f: f)
class _BP:
    def __init__(self, *a, **k): pass
    def route(self, *a, **k): return lambda f: f
sys.modules['flask'].Blueprint = _BP
sys.modules['flask'].jsonify = lambda *a, **k: None
sys.modules['flask'].request = None
sys.modules['flask'].send_file = lambda *a, **k: None

import importlib.util
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('dp', os.path.join(ROOT, 'backend/api/docprocess.py'))
dp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dp)


# ── Test harness ─────────────────────────────────────────────────────────
FAILURES = []
PASSES = 0


def assert_eq(label, actual, expected):
    global PASSES
    if actual == expected:
        PASSES += 1
        print(f"  PASS  {label}")
    else:
        FAILURES.append((label, expected, actual))
        print(f"  FAIL  {label}: expected={expected!r} actual={actual!r}")


def assert_true(label, condition, detail=""):
    global PASSES
    if condition:
        PASSES += 1
        print(f"  PASS  {label}")
    else:
        FAILURES.append((label, True, condition))
        print(f"  FAIL  {label} {detail}")


def df(rows):
    """Build a header=None DataFrame from a list of rows (lists)."""
    max_cols = max((len(r) for r in rows), default=0)
    padded = [list(r) + [None] * (max_cols - len(r)) for r in rows]
    return pd.DataFrame(padded)


# ── Tests ────────────────────────────────────────────────────────────────

def test_empty_sheet():
    print("\n[1] Empty sheet")
    qs, col, err = dp._parse_sheet("Empty", df([]))
    assert_eq("empty: no questions", qs, [])
    assert_eq("empty: no error", err, None)


def test_single_blank_row():
    print("\n[2] Sheet with only one blank row")
    qs, col, err = dp._parse_sheet("Blank", df([[None, None, None]]))
    assert_eq("blank: no questions", qs, [])
    assert_eq("blank: no error", err, None)


def test_simple_header_row0():
    print("\n[3] Simple header at row 0 with 'Question'")
    rows = [
        ["Question", "Response", "Comment"],
        ["What is your name?", "X", ""],
        ["Do you encrypt data at rest?", "Y", ""],
        ["Provide details about your SDLC and code review process.", "Z", ""],
    ]
    qs, col, err = dp._parse_sheet("S", df(rows))
    assert_eq("simple: count", len(qs), 3)
    assert_eq("simple: col", col, "Question")
    assert_eq("simple: no error", err, None)


def test_header_deep_row3():
    print("\n[4] Header on row 3 (CVS-style sheet)")
    rows = [
        ["Application Security", 13, 13, 0, 0, 0],
        [None, None, None, None, None, None],
        ["Answered: 0/13", None, None, None, None, None],
        ["Question", "Response", "Comment", "Attachment(s)", "Follow-up Question", "Follow-up Response"],
        ["AS.01 Does your company develop software for our customers?", 1, True, False, 1, 1],
        ["AS.02 Do you have a documented SDLC in place?", 1, True, False, 1, 1],
    ]
    qs, col, err = dp._parse_sheet("Section 2", df(rows))
    assert_eq("deep: count", len(qs), 2)
    assert_eq("deep: col", col, "Question")
    assert_eq("deep: no error", err, None)


def test_questions_plural():
    print("\n[5] Header 'Questions' (plural)")
    rows = [
        ["Questions", "Notes"],
        ["What is your security posture summary?", ""],
        ["Describe your audit logging approach.", ""],
    ]
    qs, col, err = dp._parse_sheet("S", df(rows))
    assert_eq("plural: count", len(qs), 2)
    assert_eq("plural: col matches", col.lower(), "questions")


def test_query_synonym():
    print("\n[6] Header 'Query' synonym")
    rows = [
        ["Query", "Answer"],
        ["What is your name and role?", ""],
        ["Provide audit policy details please.", ""],
    ]
    qs, col, err = dp._parse_sheet("S", df(rows))
    assert_eq("query: count", len(qs), 2)
    assert_eq("query: col", col, "Query")


def test_questionnaire_substring():
    print("\n[7] Header 'Questionnaire item' (substring match)")
    rows = [
        ["Questionnaire item", "Score"],
        ["Describe your encryption practices for data in transit.", ""],
        ["Describe your encryption practices for data at rest.", ""],
    ]
    qs, col, err = dp._parse_sheet("S", df(rows))
    assert_eq("substr: count", len(qs), 2)
    assert_true("substr: col contains 'question'", "question" in col.lower())


def test_case_insensitive():
    print("\n[8] Case-insensitive 'QUESTION'")
    rows = [
        ["QUESTION", "RESPONSE"],
        ["Provide a description of your network segmentation.", ""],
        ["Provide a description of your patching cadence.", ""],
    ]
    qs, col, err = dp._parse_sheet("S", df(rows))
    assert_eq("upper: count", len(qs), 2)


def test_headerless_single_column():
    print("\n[9] Headerless sheet — single column of questions")
    rows = [
        ["What is your company's primary line of business and main locations?"],
        ["Describe your incident response plan and escalation paths."],
        ["Explain how you handle access reviews for privileged users."],
    ]
    qs, col, err = dp._parse_sheet("Q", df(rows))
    assert_eq("headerless1: count", len(qs), 3)
    assert_true("headerless1: display col label",
                col and "auto-detected" in col, f"col={col!r}")


def test_headerless_multi_column():
    print("\n[10] Headerless sheet — multi-column, longest text wins")
    rows = [
        ["A", "Describe your approach to vulnerability management end-to-end.", 1],
        ["B", "Describe your approach to data classification and labeling.", 2],
        ["C", "Describe your approach to third-party risk management.", 3],
    ]
    qs, col, err = dp._parse_sheet("Q", df(rows))
    assert_eq("headerless_multi: count", len(qs), 3)
    assert_eq("headerless_multi: no error", err, None)


def test_summary_index_sheet():
    print("\n[11] Summary/index sheet — should be SKIPPED silently")
    rows = [
        [None, None, None],
        [None, None, None],
        ["Section", "Answered", "Total"],
        ["General Questions", "0", "11"],
        ["Application Security", "0", "13"],
        ["Asset Management", "0", "8"],
    ]
    qs, col, err = dp._parse_sheet("Summary", df(rows))
    assert_eq("summary: skipped (no questions)", qs, [])
    assert_eq("summary: no error", err, None)


def test_header_no_question_column_with_data():
    print("\n[12] Real data sheet with header but no Question column → ERROR")
    rows = [
        ["Topic", "Answer", "Reviewer"],
        ["Describe your information security program in detail and how it is governed.", "A long-form answer here that simulates real submission content.", "Sanjeev"],
        ["Describe your data protection program in detail and how it is governed.", "Another long answer that exceeds the 30-char threshold easily.", "Sanjeev"],
    ]
    qs, col, err = dp._parse_sheet("Risk Topics", df(rows))
    assert_eq("nocol_data: no questions", qs, [])
    assert_true("nocol_data: error mentions sheet", err and "Risk Topics" in err, f"err={err!r}")
    assert_true("nocol_data: error mentions columns", err and "Topic" in err, f"err={err!r}")


def test_duplicate_header_names():
    print("\n[13] Duplicate header names — must not crash, dedup keeps first")
    rows = [
        ["Question", "Notes", "Notes"],
        ["What is your incident response plan summary?", "x", "y"],
        ["What is your business continuity plan summary?", "x", "y"],
    ]
    qs, col, err = dp._parse_sheet("Dup", df(rows))
    assert_eq("dup: count", len(qs), 2)
    assert_eq("dup: col", col, "Question")
    assert_eq("dup: no error", err, None)


def test_blank_rows_within_data():
    print("\n[14] Blank rows interleaved with data")
    rows = [
        ["Question", "Response"],
        ["Describe your endpoint protection strategy.", ""],
        [None, None],
        [None, None],
        ["Describe your patch management cadence.", ""],
        [None, None],
        ["Describe your phishing awareness program.", ""],
    ]
    qs, col, err = dp._parse_sheet("S", df(rows))
    assert_eq("blanks: count", len(qs), 3)


def test_numeric_only_question_column_rows():
    print("\n[15] Numbers / very short cells filtered as invalid questions")
    rows = [
        ["Question", "Response"],
        ["1", "x"],            # too short
        ["N/A", "x"],          # too short
        ["nan", "x"],          # literal nan string
        ["Describe your security awareness training program clearly.", "x"],
    ]
    qs, col, err = dp._parse_sheet("S", df(rows))
    assert_eq("filter: count", len(qs), 1)


def test_unicode_questions():
    print("\n[16] Unicode characters in questions and headers")
    rows = [
        ["Question", "Réponse"],
        ["¿Cuál es su política de seguridad? 安全策略是什么？", ""],
        ["Décrivez votre plan de réponse aux incidents en détail.", ""],
    ]
    qs, col, err = dp._parse_sheet("Unicode", df(rows))
    assert_eq("unicode: count", len(qs), 2)
    assert_eq("unicode: col", col, "Question")


def test_long_paragraph_not_treated_as_header():
    print("\n[17] Long paragraph containing word 'question' is NOT a header")
    long_para = ("Important: Each question below must be answered in full and "
                 "supported with appropriate evidence. Failure to respond completely "
                 "will result in delays. Please review every question carefully.")
    rows = [
        [long_para],
        [None],
        ["Topic", "Answer", "Status"],   # likely-header but no Question col
        ["Describe your governance framework in detail with controls.", "x", "open"],
        ["Describe your risk assessment methodology with frequency.", "x", "open"],
    ]
    qs, col, err = dp._parse_sheet("Notes", df(rows))
    # This sheet has substantial data + a header without Question column → error
    assert_eq("longpara: no questions", qs, [])
    assert_true("longpara: error", err is not None, f"err={err!r}")


def test_only_whitespace_cells():
    print("\n[18] Sheet with only whitespace cells → empty/skip")
    rows = [
        ["   ", "\t", "\n"],
        ["", "  ", ""],
    ]
    qs, col, err = dp._parse_sheet("WS", df(rows))
    assert_eq("ws: no questions", qs, [])
    assert_eq("ws: no error", err, None)


def test_question_column_all_empty():
    print("\n[19] Question column exists but every cell is empty/invalid")
    rows = [
        ["Question", "Response"],
        [None, "yes"],
        ["", "no"],
        ["nan", "maybe"],
        ["x", "?"],   # too short
    ]
    qs, col, err = dp._parse_sheet("S", df(rows))
    assert_eq("allempty: no questions", qs, [])
    assert_true("allempty: error", err is not None and "No valid questions" in err,
                f"err={err!r}")


def test_question_column_with_unnamed_columns():
    print("\n[20] Question column found among 'Unnamed' / NaN columns")
    rows = [
        ["Question", None, None, "Comment"],
        ["What is your data retention policy and duration period?", "x", "y", "z"],
        ["What is your access termination process timing and steps?", "x", "y", "z"],
    ]
    qs, col, err = dp._parse_sheet("Sparse", df(rows))
    assert_eq("sparse: count", len(qs), 2)


def test_huge_sheet_no_crash():
    print("\n[21] Large sheet (5000 rows) — must complete without issue")
    rows = [["Question", "Response"]]
    for i in range(5000):
        rows.append([f"Question number {i} describing some compliance control point.", ""])
    qs, col, err = dp._parse_sheet("Big", df(rows))
    assert_eq("big: count", len(qs), 5000)


def test_header_with_extra_whitespace():
    print("\n[22] Header 'Question  ' with trailing spaces")
    rows = [
        ["  Question  ", "Response"],
        ["Describe your security incident escalation matrix.", ""],
    ]
    qs, col, err = dp._parse_sheet("WS", df(rows))
    assert_eq("ws_header: count", len(qs), 1)
    assert_eq("ws_header: col stripped", col, "Question")


def test_actual_file():
    print("\n[23] Real CVS file — Full Assessment - Jun 2020.xlsx")
    src = "/Users/sanjeevkumar/Downloads/Full Assessment - Jun 2020.xlsx"
    if not os.path.exists(src):
        print(f"  SKIP  source file not present: {src}")
        return
    raw_sheets = pd.read_excel(src, sheet_name=None, header=None)
    total, errors, skipped = 0, [], []
    for name, raw in raw_sheets.items():
        qs, col, err = dp._parse_sheet(name, raw)
        if err:
            errors.append((name, err))
        elif not qs:
            skipped.append(name)
        else:
            total += len(qs)
    assert_eq("real: total questions", total, 251)
    assert_eq("real: errors", errors, [])
    assert_eq("real: skipped sheets", skipped, ["Summary"])


def test_only_header_no_data():
    print("\n[24] Sheet with only a header row, no data")
    rows = [["Question", "Response", "Comment"]]
    qs, col, err = dp._parse_sheet("HeaderOnly", df(rows))
    assert_eq("headeronly: no questions", qs, [])
    # Either error or silent skip is acceptable for this odd case;
    # current behavior surfaces a friendly error.
    print(f"  INFO  err={err!r}")


def test_single_long_question_no_header():
    print("\n[25] One long question, no header")
    rows = [
        ["Please describe in detail your end-to-end approach to vulnerability management, including discovery, prioritization, remediation SLAs, and reporting cadence."]
    ]
    qs, col, err = dp._parse_sheet("Q", df(rows))
    assert_eq("singleq: count", len(qs), 1)


def test_summary_with_long_paragraph_first():
    print("\n[26] Summary-like sheet where row 0 has a huge instruction paragraph")
    long_instructions = (
        "Additional Contacts: If you would like to delegate a question or control "
        "section within the assessment, navigate to the Contacts module. " * 3
    )
    rows = [
        [None],
        [None],
        ["Title XYZ"],
        [long_instructions, long_instructions],
        [None],
        ["Section", "Answered", "Total"],
        ["General Questions", 0, 11],
        ["Application Security", 0, 13],
    ]
    qs, col, err = dp._parse_sheet("Summary", df(rows))
    # No Question column; the substantial data is index rows (short labels).
    # Our heuristic counts the long instruction paragraph as substantial,
    # so this MIGHT now error. Document behavior.
    print(f"  INFO  qs={len(qs)} col={col!r} err={err!r}")
    # Acceptable outcomes: either skip OR clear error. Never wrong questions.
    assert_true("summary_paragraph: no junk questions extracted", len(qs) == 0,
                f"qs={qs!r}")


def test_helpers_directly():
    print("\n[27] Helper-function unit tests")
    assert_eq("match: exact 'Question'", dp._match_question_column(["Question", "X"]), "Question")
    assert_eq("match: case", dp._match_question_column(["QUESTION", "X"]), "QUESTION")
    assert_eq("match: long paragraph not matched",
              dp._match_question_column(["The question about your policy is critical " * 5, "X"]), None)
    assert_eq("match: none", dp._match_question_column(["Topic", "Answer"]), None)
    assert_true("valid: too short", not dp._is_valid_question("Hi"))
    assert_true("valid: 'nan' string", not dp._is_valid_question("nan"))
    assert_true("valid: real q", dp._is_valid_question("Describe your security posture please."))
    assert_eq("dedupe", dp._dedupe_columns(["A", "B", "A", "A"]), ["A", "B", "A.1", "A.2"])


# ── Run all ──────────────────────────────────────────────────────────────
TESTS = [
    test_empty_sheet,
    test_single_blank_row,
    test_simple_header_row0,
    test_header_deep_row3,
    test_questions_plural,
    test_query_synonym,
    test_questionnaire_substring,
    test_case_insensitive,
    test_headerless_single_column,
    test_headerless_multi_column,
    test_summary_index_sheet,
    test_header_no_question_column_with_data,
    test_duplicate_header_names,
    test_blank_rows_within_data,
    test_numeric_only_question_column_rows,
    test_unicode_questions,
    test_long_paragraph_not_treated_as_header,
    test_only_whitespace_cells,
    test_question_column_all_empty,
    test_question_column_with_unnamed_columns,
    test_huge_sheet_no_crash,
    test_header_with_extra_whitespace,
    test_actual_file,
    test_only_header_no_data,
    test_single_long_question_no_header,
    test_summary_with_long_paragraph_first,
    test_helpers_directly,
]

for t in TESTS:
    try:
        t()
    except Exception as e:
        FAILURES.append((t.__name__, "no exception", repr(e)))
        print(f"  FAIL  {t.__name__} raised: {e!r}")

print("\n" + "=" * 70)
print(f"PASSED: {PASSES}   FAILED: {len(FAILURES)}")
if FAILURES:
    print("Failures:")
    for label, exp, act in FAILURES:
        print(f"  - {label}: expected={exp!r} actual={act!r}")
    sys.exit(1)
print("All tests passed.")
