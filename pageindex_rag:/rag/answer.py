from rag.simple_retriever import search_sections
from llm.azure_llm import ask_llm


def answer_question(question: str):
    sections = search_sections(question)

    context = "\n\n".join(
        f"## {title}\n{content}" for title, content in sections
    )

    prompt = f"""
Use ONLY the context below to answer.

Context:
{context}

Question:
{question}

Answer with bullet points.
"""

    return ask_llm(prompt)