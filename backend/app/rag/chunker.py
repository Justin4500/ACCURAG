from typing import List, Dict, Any
from app.core.config import settings


class ChunkItem:
    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        document_name: str,
        page_number: int,
        chunk_index: int,
        text: str,
        token_count: int,
        metadata: Dict[str, Any]
    ):
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.document_name = document_name
        self.page_number = page_number
        self.chunk_index = chunk_index
        self.text = text
        self.token_count = token_count
        self.metadata = metadata

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "document_id": self.document_id,
            "document_name": self.document_name,
            "page_number": self.page_number,
            "chunk_index": self.chunk_index,
            "text": self.text,
            "token_count": self.token_count,
            "metadata": self.metadata,
        }


class TextChunker:
    """
    Splits document pages into semantic chunks with token/character limits,
    preserving document IDs, page numbers, and metadata.
    """

    def __init__(
        self,
        chunk_size_tokens: int = settings.CHUNK_SIZE,
        chunk_overlap_tokens: int = settings.CHUNK_OVERLAP
    ):
        self.chunk_size_tokens = chunk_size_tokens
        self.chunk_overlap_tokens = chunk_overlap_tokens
        # Heuristic: 1 token ~= 4 characters / 0.75 words
        self.target_chars = chunk_size_tokens * 4
        self.overlap_chars = chunk_overlap_tokens * 4

    def chunk_pages(
        self,
        pages: List[Dict[str, Any]],
        document_id: str,
        document_name: str,
        user_id: str,
        collection_ids: List[str] = None
    ) -> List[ChunkItem]:
        chunks: List[ChunkItem] = []
        global_chunk_index = 0

        for page in pages:
            page_num = page.get("page_number", 1)
            raw_text = page.get("text", "").strip()
            if not raw_text:
                continue

            page_chunks = self._split_page_text(raw_text)

            for p_chunk in page_chunks:
                chunk_text = p_chunk.strip()
                if not chunk_text:
                    continue

                chunk_id = f"{document_id}_p{page_num}_c{global_chunk_index}"
                est_tokens = max(1, len(chunk_text) // 4)

                meta = {
                    "document_id": document_id,
                    "document_name": document_name,
                    "user_id": user_id,
                    "page_number": int(page_num),
                    "chunk_index": int(global_chunk_index),
                    "collections": ",".join(collection_ids) if collection_ids else "",
                }

                chunks.append(
                    ChunkItem(
                        chunk_id=chunk_id,
                        document_id=document_id,
                        document_name=document_name,
                        page_number=page_num,
                        chunk_index=global_chunk_index,
                        text=chunk_text,
                        token_count=est_tokens,
                        metadata=meta,
                    )
                )
                global_chunk_index += 1

        return chunks

    def _split_page_text(self, text: str) -> List[str]:
        if len(text) <= self.target_chars:
            return [text]

        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = start + self.target_chars
            if end >= text_len:
                chunks.append(text[start:])
                break

            # Find sensible split boundary near end (paragraph, period, or space)
            split_idx = -1
            # Search backward within reasonable window (up to 300 chars back)
            search_window = text[max(start, end - 300):min(text_len, end + 100)]
            offset = max(start, end - 300)

            # Try paragraph break
            p_break = search_window.rfind("\n\n")
            if p_break != -1:
                split_idx = offset + p_break + 2
            else:
                # Try sentence end
                for punct in [". ", "? ", "! ", ".\n", ")\n"]:
                    s_break = search_window.rfind(punct)
                    if s_break != -1:
                        split_idx = offset + s_break + len(punct)
                        break

            if split_idx == -1 or split_idx <= start:
                # Fallback to last space
                space_break = search_window.rfind(" ")
                if space_break != -1:
                    split_idx = offset + space_break + 1
                else:
                    split_idx = end

            chunks.append(text[start:split_idx].strip())
            # Advance with overlap
            start = max(split_idx - self.overlap_chars, start + 1)

        return [c for c in chunks if c]
