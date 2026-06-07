import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.database import get_db
from app.auth.jwt_handler import get_current_user
from app.models.models import User, Conversation, Message, UserRole
from app.schemas.schemas import (
    ChatRequest, ChatResponse, ConversationOut, ConversationDetail,
    MessageOut, ConversationRename,
)
from app.services.rag_service import process_chat, get_or_create_conversation
from app.rag.pipeline import retrieve_context, build_rag_prompt, passes_rag_guard, NO_CONTEXT_REPLY
from app.services.llm_service import stream_chat_completion
from app.services.web_search_service import web_search_prompt_async

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return process_chat(
        user_message=request.message,
        user_id=current_user.id,
        db=db,
        conversation_id=request.conversation_id,
        model_override=request.model_override,
        allow_web_search=request.allow_web_search,
        is_admin=(current_user.role == UserRole.ADMIN),
        skip_user_message=request.skip_user_message,
        force_web_search=request.force_web_search,
        source_ids=request.source_ids,
    )


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.models import MessageRole, Settings

    settings = db.query(Settings).filter(Settings.user_id == current_user.id).first()
    model = request.model_override or (settings.model_name if settings else "llama-3.3-70b-versatile")
    temperature = settings.temperature if settings else 0.7
    max_tokens = settings.max_tokens if settings else 2048
    top_p = settings.top_p if settings else 0.9
    top_k = settings.top_k if settings else 5
    threshold = settings.similarity_threshold if settings else 0.5

    conv = get_or_create_conversation(request.conversation_id, current_user.id, db)

    user_msg = Message(conversation_id=conv.id, role=MessageRole.USER, content=request.message)
    db.add(user_msg)
    db.commit()

    chunks, _ = retrieve_context(
        query=request.message, user_id=current_user.id, db=db,
        is_admin=(current_user.role == UserRole.ADMIN),
        top_k=top_k, similarity_threshold=threshold,
        source_ids=request.source_ids,
    )

    async def event_stream():
        guard_passed = passes_rag_guard(chunks)
        meta = json.dumps({
            "conversation_id": conv.id,
            "retrieved_chunks": chunks,
            "web_search_available": not guard_passed and not request.allow_web_search,
            "from_web": request.allow_web_search and not guard_passed,
        })
        yield f"data: {json.dumps({'type': 'meta', 'data': meta})}\n\n"

        # No relevant context in documents
        if not guard_passed:
            if request.allow_web_search:
                # Stream answer from web search
                web_prompt, sources = await web_search_prompt_async(request.message)
                full_response = []
                async for token in stream_chat_completion(
                    prompt=web_prompt, model=model,
                    temperature=temperature, max_tokens=max_tokens, top_p=top_p,
                ):
                    full_response.append(token)
                    yield f"data: {json.dumps({'type': 'token', 'data': token})}\n\n"

                answer = "".join(full_response)
                asst_msg = Message(
                    conversation_id=conv.id,
                    role=MessageRole.ASSISTANT,
                    content=answer,
                    retrieved_chunks=json.dumps([]),
                    from_web=True,
                )
                db.add(asst_msg)
                conv.updated_at = func.now()
                db.commit()
                yield f"data: {json.dumps({'type': 'done', 'message_id': asst_msg.id, 'from_web': True})}\n\n"
            else:
                # Ask permission
                asst_msg = Message(
                    conversation_id=conv.id,
                    role=MessageRole.ASSISTANT,
                    content=NO_CONTEXT_REPLY,
                    retrieved_chunks=json.dumps([]),
                )
                db.add(asst_msg)
                conv.updated_at = func.now()
                db.commit()
                yield f"data: {json.dumps({'type': 'token', 'data': NO_CONTEXT_REPLY})}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'message_id': asst_msg.id, 'web_search_available': True})}\n\n"
            return

        # Normal RAG answer
        rag_prompt = build_rag_prompt(request.message, chunks)
        full_response = []

        async for token in stream_chat_completion(
            prompt=rag_prompt, model=model,
            temperature=temperature, max_tokens=max_tokens, top_p=top_p,
        ):
            full_response.append(token)
            yield f"data: {json.dumps({'type': 'token', 'data': token})}\n\n"

        answer = "".join(full_response)
        asst_msg = Message(
            conversation_id=conv.id,
            role=MessageRole.ASSISTANT,
            content=answer,
            rag_context=rag_prompt,
            retrieved_chunks=json.dumps(chunks),
        )
        db.add(asst_msg)
        conv.updated_at = func.now()
        db.commit()
        yield f"data: {json.dumps({'type': 'done', 'message_id': asst_msg.id})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/history", response_model=List[ConversationOut])
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    result = []
    for conv in conversations:
        msg_count = db.query(Message).filter(Message.conversation_id == conv.id).count()
        out = ConversationOut.model_validate(conv)
        out.message_count = msg_count
        result.append(out)
    return result


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id, Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationDetail.model_validate(conv)


@router.patch("/{conversation_id}/rename", response_model=ConversationOut)
def rename_conversation(
    conversation_id: int,
    body: ConversationRename,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id, Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.title = body.title
    db.commit()
    db.refresh(conv)
    return ConversationOut.model_validate(conv)


@router.delete("/{conversation_id}", status_code=204)
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id, Conversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
