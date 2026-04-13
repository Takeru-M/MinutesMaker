def split_text(text: str, *, chunk_size: int, chunk_overlap: int) -> list[str]:
    normalized = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    if not normalized:
        return []

    if chunk_size <= 0:
        return [normalized]

    overlap = max(0, min(chunk_overlap, chunk_size - 1 if chunk_size > 1 else 0))
    step = max(1, chunk_size - overlap)

    chunks: list[str] = []
    start = 0
    while start < len(normalized):
        end = min(len(normalized), start + chunk_size)
        chunk = normalized[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(normalized):
            break
        start += step

    return chunks
