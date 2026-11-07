from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel
from app.models.chat import MessageRole
from app.schemas.rag import CitationItem


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: MessageRole
    content: str
    citations: Optional[List[CitationItem]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationCreate(BaseModel):
    title: Optional[str] = "New Chat"
    collection_id: Optional[str] = None


class ConversationUpdate(BaseModel):
    title: str


class ConversationListItem(BaseModel):
    id: str
    title: str
    collection_id: Optional[str] = None
    message_count: int
    last_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    id: str
    title: str
    collection_id: Optional[str] = None
    messages: List[MessageResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SendMessageRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    collection_id: Optional[str] = None
    document_ids: Optional[List[str]] = None


class FeedbackCreate(BaseModel):
    message_id: str
    rating: int  # 1 for positive, -1 for negative
    comments: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: str
    message_id: str
    rating: int
    comments: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
