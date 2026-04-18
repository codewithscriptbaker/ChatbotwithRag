from dataclasses import dataclass


@dataclass
class Chunk:
    index: int
    text: str
    token_estimate: int


def chunk_text(
    text: str,
    chunk_size: int = 800,
    overlap: int = 120,
) -> list[Chunk]:
    """Split text into overlapping chunks by character count.

    Uses a simple whitespace-aware splitter that avoids cutting mid-word.
    Token estimate is chars / 4 (rough approximation for English).
    """
    if not text.strip():
        return []

    chunks: list[Chunk] = []
    start = 0
    idx = 0

    while start < len(text):
        end = start + chunk_size

        if end < len(text):
            boundary = text.rfind(" ", start, end)
            if boundary > start:
                end = boundary

        chunk_text_slice = text[start:end].strip()
        if chunk_text_slice:
            chunks.append(
                Chunk(
                    index=idx,
                    text=chunk_text_slice,
                    token_estimate=max(1, len(chunk_text_slice) // 4),
                )
            )
            idx += 1

        start = end - overlap if end < len(text) else len(text)

    return chunks
