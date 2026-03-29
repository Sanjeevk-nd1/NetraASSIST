# rag/graph.py
from langgraph.graph import StateGraph
from rag.tree_reasoner import tree_reasoner
from rag.load_sections import load_sections
from rag.answer import answer

class State(dict): pass

g = StateGraph(State)
g.add_node("reason", tree_reasoner)
g.add_node("load", load_sections)
g.add_node("answer", answer)
g.add_edge("reason", "load")
g.add_edge("load", "answer")
g.set_entry_point("reason")
g.set_finish_point("answer")

rag_graph = g.compile()