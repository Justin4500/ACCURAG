from typing import Optional, List
from pydantic import BaseModel


class CitationItem(BaseModel):
    document_id: str
    document_name: str
    page_number: Optional[int] = None
    excerpt: str
    score: Optional[float] = None
    source_type: Optional[str] = "document"  # "document" or "web"
    url: Optional[str] = None


class RagQueryRequest(BaseModel):
    query: str
    conversation_id: Optional[str] = None
    collection_id: Optional[str] = None
    document_ids: Optional[List[str]] = None
    top_k: Optional[int] = None


class RagQueryResponse(BaseModel):
    answer: str
    citations: List[CitationItem]
    conversation_id: str
    message_id: str
    has_sufficient_context: bool = True
    source_type: Optional[str] = "document"
