from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.document import DocumentStatus


class DocumentResponse(BaseModel):
    id: str
    file_name: str
    file_type: str
    file_size_bytes: int
    page_count: int
    chunk_count: int
    status: DocumentStatus
    error_message: Optional[str] = None
    ocr_required: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int


class DocumentRetryResponse(BaseModel):
    id: str
    message: str
    status: DocumentStatus
