# rag/tree_reasoner.py
from llm.azure_llm import invoke

def tree_reasoner(state):
    prompt = f"""
Question:
{state['question']}

Document tree:
{state['tree']}

Return relevant section IDs as JSON array.
"""
    state["section_ids"] = invoke(prompt)
    return state