from pathlib import Path
import json
from collections.abc import AsyncIterator
import httpx

from app.core.config import get_settings
from app.vectorstore.search import SearchResult

_PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "rag_system_prompt.txt"
_prompt_template: str | None = None


def _load_prompt_template() -> str:
    global _prompt_template
    if _prompt_template is None:
        _prompt_template = _PROMPT_PATH.read_text(encoding="utf-8")
    return _prompt_template


def build_prompt(chunks: list[SearchResult], question: str) -> str:
    context_parts = []
    for r in chunks:
        context_parts.append(f"[Chunk {r.chunk_index}] (score: {r.score})\n{r.text}")

    context = "\n\n---\n\n".join(context_parts)
    template = _load_prompt_template()
    return template.replace("{context}", context).replace("{question}", question)


async def generate_answer(
    prompt: str,
    temperature: float = 0.2,
) -> str:
    settings = get_settings()
    url = f"{settings.ollama_base_url}/api/chat"

    payload = {
        "model": settings.ollama_chat_model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "options": {"temperature": temperature},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()

    data = response.json()
    return data.get("message", {}).get("content", "").strip()


async def stream_answer(
    prompt: str,
    temperature: float = 0.2,
) -> AsyncIterator[str]:
    settings = get_settings()
    url = f"{settings.ollama_base_url}/api/chat"

    payload = {
        "model": settings.ollama_chat_model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
        "options": {"temperature": temperature},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line:
                    continue
                obj = json.loads(line)
                msg = obj.get("message", {})
                content = msg.get("content")
                if content:
                    yield str(content)
                if obj.get("done"):
                    break
