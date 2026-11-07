import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.chat import Conversation, Message, MessageRole, Feedback
from app.models.document import Document, Collection
from app.schemas.chat import ConversationCreate, ConversationUpdate, MessageResponse, ConversationListItem, ConversationDetail
from app.schemas.analytics import AnalyticsResponse


class ChatService:
    @staticmethod
    def create_conversation(db: Session, user_id: str, conv_in: Optional[ConversationCreate] = None) -> Conversation:
        conv_id = str(uuid.uuid4())
        title = (conv_in.title if conv_in and conv_in.title else "New Chat").strip()
        col_id = conv_in.collection_id if conv_in else None

        conv = Conversation(
            id=conv_id,
            user_id=user_id,
            title=title,
            collection_id=col_id
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)
        return conv

    @staticmethod
    def list_conversations(db: Session, user_id: str) -> List[ConversationListItem]:
        convs = db.query(Conversation).filter(
            Conversation.user_id == user_id
        ).order_by(Conversation.updated_at.desc()).all()

        results = []
        for c in convs:
            msg_count = len(c.messages)
            last_msg = c.messages[-1].content[:60] if c.messages else None
            results.append(
                ConversationListItem(
                    id=c.id,
                    title=c.title,
                    collection_id=c.collection_id,
                    message_count=msg_count,
                    last_message=last_msg,
                    created_at=c.created_at,
                    updated_at=c.updated_at,
                )
            )
        return results

    @staticmethod
    def get_conversation_detail(db: Session, user_id: str, conversation_id: str) -> Optional[ConversationDetail]:
        conv = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id
        ).first()
        if not conv:
            return None

        messages = [
            MessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                role=m.role,
                content=m.content,
                citations=m.citations,
                created_at=m.created_at
            )
            for m in conv.messages
        ]

        return ConversationDetail(
            id=conv.id,
            title=conv.title,
            collection_id=conv.collection_id,
            messages=messages,
            created_at=conv.created_at,
            updated_at=conv.updated_at
        )

    @staticmethod
    def update_conversation(db: Session, user_id: str, conversation_id: str, conv_in: ConversationUpdate) -> Optional[Conversation]:
        conv = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id
        ).first()
        if not conv:
            return None
        conv.title = conv_in.title.strip()
        db.commit()
        db.refresh(conv)
        return conv

    @staticmethod
    def delete_conversation(db: Session, user_id: str, conversation_id: str) -> bool:
        conv = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id
        ).first()
        if not conv:
            return False
        db.delete(conv)
        db.commit()
        return True

    @staticmethod
    def add_message(
        db: Session,
        conversation_id: str,
        role: MessageRole,
        content: str,
        citations: Optional[List[Dict[str, Any]]] = None
    ) -> Message:
        msg_id = str(uuid.uuid4())
        msg = Message(
            id=msg_id,
            conversation_id=conversation_id,
            role=role,
            content=content,
            citations=citations
        )
        db.add(msg)
        
        # Touch parent conversation updated_at
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv:
            conv.title = conv.title if conv.title != "New Chat" else content[:35] + ("..." if len(content) > 35 else "")
        db.commit()
        db.refresh(msg)
        return msg

    @staticmethod
    def submit_feedback(db: Session, user_id: str, message_id: str, rating: int, comments: Optional[str] = None) -> Feedback:
        # Check existing
        existing = db.query(Feedback).filter(Feedback.message_id == message_id, Feedback.user_id == user_id).first()
        if existing:
            existing.rating = rating
            existing.comments = comments
            db.commit()
            db.refresh(existing)
            return existing

        fb = Feedback(
            id=str(uuid.uuid4()),
            message_id=message_id,
            user_id=user_id,
            rating=rating,
            comments=comments
        )
        db.add(fb)
        db.commit()
        db.refresh(fb)
        return fb

    @staticmethod
    def get_analytics(db: Session, user_id: str) -> AnalyticsResponse:
        docs = db.query(Document).filter(Document.user_id == user_id).all()
        total_docs = len(docs)
        total_pages = sum(d.page_count for d in docs)
        total_chunks = sum(d.chunk_count for d in docs)
        total_bytes = sum(d.file_size_bytes for d in docs)

        convs = db.query(Conversation).filter(Conversation.user_id == user_id).all()
        total_convs = len(convs)
        total_msgs = sum(len(c.messages) for c in convs)

        total_cols = db.query(Collection).filter(Collection.user_id == user_id).count()

        return AnalyticsResponse(
            total_documents=total_docs,
            total_pages=total_pages,
            total_chunks=total_chunks,
            total_conversations=total_convs,
            total_messages=total_msgs,
            total_collections=total_cols,
            storage_used_bytes=total_bytes,
            storage_used_mb=round(total_bytes / (1024 * 1024), 2)
        )
