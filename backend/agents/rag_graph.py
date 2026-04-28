from functools import lru_cache
from datetime import datetime, timezone
import json
from collections.abc import AsyncIterator
from typing import Any, Callable, Literal, TypedDict

from langgraph.graph import END, StateGraph

from app.services.chat_service import build_prompt, generate_answer, stream_answer
from app.services.retrieval_service import retrieve
from app.vectorstore.search import SearchResult


class ToolSpec(TypedDict):
    name: str
    description: str
    handler: Callable[[dict[str, Any]], dict[str, Any]]


def _weather_tool_handler(_: dict[str, Any]) -> dict[str, Any]:
    # Placeholder handler until a weather provider is integrated.
    return {
        "answer": "Weather tool is configured, but a weather provider is not integrated yet."
    }


def _date_tool_handler(_: dict[str, Any]) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {"answer": f"Current UTC date/time is {now.isoformat()}"}


TOOL_REGISTRY: dict[str, ToolSpec] = {
    "weather": {
        "name": "weather",
        "description": "Get weather/forecast for a location and time window.",
        "handler": _weather_tool_handler,
    },
    "date": {
        "name": "date",
        "description": "Get the current date and time.",
        "handler": _date_tool_handler,
    },
}


def _build_intent_prompt(question: str, has_document_id: bool) -> str:
    routes = ["chat", "rag_doc"] + [f"tool:{tool_name}" for tool_name in TOOL_REGISTRY]
    routes_json = json.dumps(routes, ensure_ascii=True)

    return f"""
You are an intent router.
Return exactly ONE minified JSON object. Do not add explanations, markdown, or code fences.

Allowed routes (must pick one exactly): {routes_json}

Rules:
1) "rag_doc" only if has_document_id=true and query is about document content.
2) Use "tool:<name>" only when that tool is clearly required.
3) Otherwise choose "chat".
4) If uncertain, choose "chat" with low confidence.

Input:
has_document_id={str(has_document_id).lower()}
query={json.dumps(question, ensure_ascii=True)}

Output schema (strict):
{{"route":"<one allowed route>","confidence":<number between 0 and 1>}}
""".strip()


def _allowed_routes() -> set[str]:
    return {"chat", "rag_doc"} | {f"tool:{name}" for name in TOOL_REGISTRY}


class ChatGraphState(TypedDict, total=False):
    document_id: str | None
    question: str
    user_query: str
    has_attached_note: bool
    top_k: int
    temperature: float
    route: str
    route_confidence: float
    tool_name: str
    chunks: list[SearchResult]
    prompt: str
    answer: str


async def _intent_classifier_node(state: ChatGraphState) -> ChatGraphState:
    question = state.get("user_query") or state["question"]
    has_document_id = bool(state.get("document_id") and str(state["document_id"]).strip())
    has_attached_note = bool(state.get("has_attached_note", False))

    if has_document_id and has_attached_note:
        return {"route": "rag_doc", "route_confidence": 1.0}

    raw = await generate_answer(
        prompt=_build_intent_prompt(question, has_document_id),
        temperature=0.0,
    )

    print("[LangGraph] intent_classifier_node: raw", raw, flush=True)
    route = "chat"
    confidence = 0.0
    try:
        parsed = json.loads(raw)
        print("[LangGraph] intent_classifier_node: parsed", parsed, flush=True)
        candidate_route = str(parsed.get("route", "")).strip()
        if candidate_route in _allowed_routes():
            if candidate_route == "rag_doc" and not has_document_id:
                candidate_route = "chat"
            route = candidate_route
        confidence = float(parsed.get("confidence", 0.0))
    except (TypeError, ValueError, json.JSONDecodeError):

        print("[LangGraph] intent_classifier_node: error")
        # Fall back to default route when classifier output is malformed.
        pass

    result: ChatGraphState = {"route": route, "route_confidence": confidence}
    if route.startswith("tool:"):
        result["tool_name"] = route.split(":", 1)[1]
    return result


def _route_after_intent(
    state: ChatGraphState,
) -> Literal["retrieve", "simple_prep", "tool_dispatch"]:
    route = state.get("route", "chat")
    if route == "rag_doc":
        return "retrieve"
    if route.startswith("tool:"):
        return "tool_dispatch"
    return "simple_prep"


def _retrieve_node(state: ChatGraphState) -> ChatGraphState:
    chunks = retrieve(
        document_id=state["document_id"],  # type: ignore[arg-type]  # narrowed by router
        question=state["question"],
        top_k=state.get("top_k", 5),
    )
    return {"chunks": chunks}


def _prompt_node(state: ChatGraphState) -> ChatGraphState:
    chunks = state.get("chunks", [])
    if not chunks:
        return {"answer": "No relevant content found in the document for your question."}
    return {"prompt": build_prompt(chunks, state["question"])}


def _simple_prep_node(state: ChatGraphState) -> ChatGraphState:
    # Same as old generic branch: pass the user text straight to the LLM as "prompt"
    return {"prompt": state["question"]}


def _tool_dispatch_node(state: ChatGraphState) -> ChatGraphState:
    tool_name = state.get("tool_name")
    if not tool_name:
        return {"answer": "Unable to run tool due to missing tool name."}

    tool = TOOL_REGISTRY.get(tool_name)
    if tool is None:
        return {"answer": f"Requested tool '{tool_name}' is not available."}

    tool_result = tool["handler"]({"question": state["question"]})
    answer = str(tool_result.get("answer", "")).strip()
    if not answer:
        return {"answer": f"Tool '{tool_name}' did not return an answer."}
    return {"answer": answer}


async def _llm_node(state: ChatGraphState) -> ChatGraphState:
    if state.get("answer"):
        return {}
    prompt = state.get("prompt")
    if not prompt:
        return {"answer": "Unable to generate answer due to missing prompt."}
    answer = await generate_answer(
        prompt=prompt,
        temperature=state.get("temperature", 0.2),
    )
    return {"answer": answer}


@lru_cache(maxsize=1)
def get_chat_graph() -> Any:
    graph = StateGraph(ChatGraphState)
    graph.add_node("intent_classifier", _intent_classifier_node)
    graph.add_node("retrieve", _retrieve_node)
    graph.add_node("prompt", _prompt_node)
    graph.add_node("simple_prep", _simple_prep_node)
    graph.add_node("tool_dispatch", _tool_dispatch_node)
    graph.add_node("llm", _llm_node)

    graph.set_entry_point("intent_classifier")
    graph.add_conditional_edges(
        "intent_classifier",
        _route_after_intent,
        {
            "retrieve": "retrieve",
            "simple_prep": "simple_prep",
            "tool_dispatch": "tool_dispatch",
        },
    )
    graph.add_edge("retrieve", "prompt")
    graph.add_edge("prompt", "llm")
    graph.add_edge("simple_prep", "llm")
    graph.add_edge("tool_dispatch", END)
    graph.add_edge("llm", END)

    return graph.compile()


async def run_chat_graph(
    *,
    document_id: str | None,
    question: str,
    user_query: str,
    has_attached_note: bool,
    top_k: int,
    temperature: float,
) -> ChatGraphState:
    return await get_chat_graph().ainvoke(
        {
            "document_id": document_id,
            "question": question,
            "user_query": user_query,
            "has_attached_note": has_attached_note,
            "top_k": top_k,
            "temperature": temperature,
        }
    )


def _prepare_graph_state(
    *,
    document_id: str | None,
    question: str,
    user_query: str,
    has_attached_note: bool,
    top_k: int,
    temperature: float,
) -> ChatGraphState:
    return {
        "document_id": document_id,
        "question": question,
        "user_query": user_query,
        "has_attached_note": has_attached_note,
        "top_k": top_k,
        "temperature": temperature,
    }


async def run_chat_graph_stream(
    *,
    document_id: str | None,
    question: str,
    user_query: str,
    has_attached_note: bool,
    top_k: int,
    temperature: float,
) -> AsyncIterator[dict[str, Any]]:
    state = _prepare_graph_state(
        document_id=document_id,
        question=question,
        user_query=user_query,
        has_attached_note=has_attached_note,
        top_k=top_k,
        temperature=temperature,
    )

    routed = {**state, **(await _intent_classifier_node(state))}
    next_step = _route_after_intent(routed)

    if next_step == "tool_dispatch":
        tool_state = {**routed, **_tool_dispatch_node(routed)}
        yield {"type": "delta", "delta": tool_state.get("answer", "")}
        yield {"type": "done", "route": routed.get("route", "chat")}
        return

    if next_step == "simple_prep":
        prepared = {**routed, **_simple_prep_node(routed)}
    else:
        retrieved = {**routed, **_retrieve_node(routed)}
        prompted = {**retrieved, **_prompt_node(retrieved)}
        if prompted.get("answer"):
            yield {"type": "delta", "delta": prompted["answer"]}
            yield {"type": "done", "route": routed.get("route", "rag_doc")}
            return
        prepared = prompted

    prompt = prepared.get("prompt")
    if not prompt:
        yield {"type": "delta", "delta": "Unable to generate answer due to missing prompt."}
        yield {"type": "done", "route": routed.get("route", "chat")}
        return

    async for token in stream_answer(
        prompt=prompt,
        temperature=temperature,
    ):
        yield {"type": "delta", "delta": token}

    yield {"type": "done", "route": routed.get("route", "chat")}