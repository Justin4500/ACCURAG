from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.schemas.document import DocumentResponse


class CollectionBase(BaseModel):
    name: str
    description: Optional[str] = None


class CollectionCreate(CollectionBase):
    pass


class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class CollectionAddDocuments(BaseModel):
    document_ids: List[str]


class CollectionResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    document_count: int
    documents: List[DocumentResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
