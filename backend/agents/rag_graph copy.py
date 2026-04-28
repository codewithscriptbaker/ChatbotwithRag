from functools import lru_cache
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from app.services.chat_service import build_prompt, generate_answer
from app.services.retrieval_service import retrieve
from app.vectorstore.search import SearchResult


class ChatGraphState(TypedDict, total=False):
    document_id: str | None
    question: str | None
    top_k: int
    temperature: float
    chunks: list[SearchResult]
    prompt: str
    answer: str


def _retrieve_node(state: ChatGraphState) -> ChatGraphState:
    print("[LangGraph] retrieve_node: entering", flush=True)
    chunks = retrieve(
        document_id=state["document_id"],
        question=state["question"],
        top_k=state.get("top_k", 5),
    )
    print("[LangGraph] retrieve_node: completed", flush=True)
    return {"chunks": chunks}


def _prompt_node(state: ChatGraphState) -> ChatGraphState:
    # print("[LangGraph] prompt_node: entering", flush=True)
    chunks = state.get("chunks", [])
    if not chunks:
        print("[LangGraph] prompt_node: no chunks -> fallback answer")

        return {"answer": "No relevant content found in the document for your question."}
    # print("[LangGraph] prompt_node: completed", flush=True)
    return {"prompt": build_prompt(chunks, state["question"])}


async def _llm_node(state: ChatGraphState) -> ChatGraphState:
    # print("[LangGraph] llm_node: entering", flush=True)
    if state.get("answer"):
        return {}

    prompt = state.get("prompt")
    print("[LangGraph] llm_node: prompt:", prompt, flush=True)
    if not prompt:
        return {"answer": "Unable to generate answer due to missing prompt."}

    answer = await generate_answer(
        prompt=prompt,
        temperature=state.get("temperature", 0.2),
    )
    # print("[LangGraph] llm_node: completed", flush=True)
    return {"answer": answer}


@lru_cache(maxsize=1)
def get_chat_graph() -> Any:
    graph = StateGraph(ChatGraphState)
    graph.add_node("retrieve", _retrieve_node)
    graph.add_node("prompt", _prompt_node)
    graph.add_node("llm", _llm_node)

    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "prompt")
    graph.add_edge("prompt", "llm")
    graph.add_edge("llm", END)

    return graph.compile()


async def run_chat_graph(
    *, document_id: str, question: str, top_k: int, temperature: float
) -> ChatGraphState:
    return await get_chat_graph().ainvoke(
        {
            "document_id": document_id,
            "question": question,
            "top_k": top_k,
            "temperature": temperature,
        }
    )