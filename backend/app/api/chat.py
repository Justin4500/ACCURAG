from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.chat_service import ChatService
from app.schemas.chat import (
    ConversationCreate,
    ConversationUpdate,
    ConversationListItem,
    ConversationDetail,
    FeedbackCreate,
    FeedbackResponse,
)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ConversationListItem, status_code=status.HTTP_201_CREATED)
def create_conversation(
    conv_in: Optional[ConversationCreate] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = ChatService.create_conversation(db, current_user.id, conv_in)
    return ConversationListItem(
        id=conv.id,
        title=conv.title,
        collection_id=conv.collection_id,
        message_count=0,
        last_message=None,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


@router.get("", response_model=List[ConversationListItem])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ChatService.list_conversations(db, current_user.id)


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    detail = ChatService.get_conversation_detail(db, current_user.id, conversation_id)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    return detail


@router.put("/{conversation_id}")
def update_conversation(
    conversation_id: str,
    conv_in: ConversationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = ChatService.update_conversation(db, current_user.id, conversation_id, conv_in)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    return {"message": "Conversation updated.", "title": conv.title}


@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = ChatService.delete_conversation(db, current_user.id, conversation_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    return {"message": "Conversation deleted successfully."}


@router.post("/feedback", response_model=FeedbackResponse)
def submit_feedback(
    fb_in: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    fb = ChatService.submit_feedback(
        db, current_user.id, fb_in.message_id, fb_in.rating, fb_in.comments
    )
    return FeedbackResponse.model_validate(fb)
