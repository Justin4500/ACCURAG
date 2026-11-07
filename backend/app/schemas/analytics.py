from pydantic import BaseModel


class AnalyticsResponse(BaseModel):
    total_documents: int
    total_pages: int
    total_chunks: int
    total_conversations: int
    total_messages: int
    total_collections: int
    storage_used_bytes: int
    storage_used_mb: float
