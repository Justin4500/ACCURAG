import json
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.chat import MessageRole
from app.services.chat_service import ChatService
from app.rag.engine import RagEngine
from app.schemas.rag import RagQueryRequest, RagQueryResponse

logger = logging.getLogger("accurate_ai.rag_api")
router = APIRouter(prefix="/rag", tags=["RAG"])


@router.post("/query", response_model=RagQueryResponse)
def query_rag(
    req: RagQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query_text = req.query.strip()
    if not query_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Query cannot be empty.")

    # 1. Resolve or create conversation
    conv_id = req.conversation_id
    chat_history = []
    if not conv_id:
        conv = ChatService.create_conversation(db, current_user.id)
        conv_id = conv.id
    else:
        existing_conv = ChatService.get_conversation_detail(db, current_user.id, conv_id)
        if existing_conv and existing_conv.messages:
            for m in existing_conv.messages[-6:]:
                chat_history.append({"role": m.role.value, "content": m.content})

    # 2. Add user message
    ChatService.add_message(
        db=db,
        conversation_id=conv_id,
        role=MessageRole.USER,
        content=query_text
    )

    # 3. Check for custom user API key in settings
    custom_key = current_user.settings.custom_gemini_key if current_user.settings else None
    engine = RagEngine(custom_gemini_key=custom_key)

    top_k = req.top_k or (current_user.settings.top_k if current_user.settings else 5)

    # 4. Run RAG engine
    result = engine.generate_answer(
        user_id=current_user.id,
        query=query_text,
        top_k=top_k,
        collection_id=req.collection_id,
        document_ids=req.document_ids,
        chat_history=chat_history
    )

    citations_data = [c.model_dump() for c in result["citations"]]

    # 5. Add assistant message with citations to conversation
    assistant_msg = ChatService.add_message(
        db=db,
        conversation_id=conv_id,
        role=MessageRole.ASSISTANT,
        content=result["answer"],
        citations=citations_data
    )

    return RagQueryResponse(
        answer=result["answer"],
        citations=result["citations"],
        conversation_id=conv_id,
        message_id=assistant_msg.id,
        has_sufficient_context=result["has_sufficient_context"],
        source_type=result.get("source_type", "document")
    )


@router.post("/stream")
async def stream_rag(
    req: RagQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query_text = req.query.strip()
    if not query_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Query cannot be empty.")

    # Resolve conversation and history
    conv_id = req.conversation_id
    chat_history = []
    if not conv_id:
        conv = ChatService.create_conversation(db, current_user.id)
        conv_id = conv.id
    else:
        existing_conv = ChatService.get_conversation_detail(db, current_user.id, conv_id)
        if existing_conv and existing_conv.messages:
            for m in existing_conv.messages[-6:]:
                chat_history.append({"role": m.role.value, "content": m.content})

    # Add user message
    ChatService.add_message(
        db=db,
        conversation_id=conv_id,
        role=MessageRole.USER,
        content=query_text
    )

    custom_key = current_user.settings.custom_gemini_key if current_user.settings else None
    engine = RagEngine(custom_gemini_key=custom_key)
    top_k = req.top_k or (current_user.settings.top_k if current_user.settings else 5)

    async def event_generator():
        collected_text = []
        captured_citations = []

        try:
            async for chunk in engine.generate_answer_stream(
                user_id=current_user.id,
                query=query_text,
                top_k=top_k,
                collection_id=req.collection_id,
                document_ids=req.document_ids,
                chat_history=chat_history
            ):
                if chunk["type"] == "citations":
                    captured_citations = chunk["citations"]
                    yield f"data: {json.dumps(chunk)}\n\n"
                elif chunk["type"] == "status":
                    yield f"data: {json.dumps(chunk)}\n\n"
                elif chunk["type"] == "text":
                    collected_text.append(chunk["content"])
                    yield f"data: {json.dumps(chunk)}\n\n"
                elif chunk["type"] == "done":
                    # Save assistant message to DB
                    full_answer = "".join(collected_text).strip()
                    asst_msg = ChatService.add_message(
                        db=db,
                        conversation_id=conv_id,
                        role=MessageRole.ASSISTANT,
                        content=full_answer,
                        citations=captured_citations
                    )
                    end_payload = {
                        "type": "done",
                        "conversation_id": conv_id,
                        "message_id": asst_msg.id
                    }
                    yield f"data: {json.dumps(end_payload)}\n\n"
        except Exception as e:
            logger.error(f"Error in stream generator: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
