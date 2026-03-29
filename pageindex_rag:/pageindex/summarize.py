# pageindex/summarize.py
from llm.azure_llm import invoke

def summarize(text):
    if not text.strip():
        return ""
    return invoke(f"Summarize in 1–2 precise sentences:\n{text[:8000]}")