import json
import time
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.models import Conversation, Message, MessageRole, Settings
from app.rag.pipeline import retrieve_context, build_rag_prompt, passes_rag_guard, llm_says_no_info, NO_CONTEXT_REPLY
from app.services.llm_service import chat_completion
from app.services.web_search_service import web_search_and_answer
from sqlalchemy import func
from app.schemas.schemas import ChatResponse


def get_or_create_conversation(conversation_id: Optional[int], user_id: int, db: Session) -> Conversation:
    if conversation_id:
        conv = db.query(Conversation).filter(
            Conversation.id == conversation_id, Conversation.user_id == user_id
        ).first()
        if conv:
            return conv

    conv = Conversation(user_id=user_id, title="New Conversation")
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def auto_title_conversation(conv: Conversation, first_message: str, db: Session) -> None:
    words = first_message.split()[:8]
    title = " ".join(words)
    if len(first_message) > 50:
        title += "..."
    conv.title = title
    db.commit()


def process_chat(
    user_message: str,
    user_id: int,
    db: Session,
    conversation_id: Optional[int] = None,
    model_override: Optional[str] = None,
    allow_web_search: bool = False,
    is_admin: bool = False,
    skip_user_message: bool = False,
    force_web_search: bool = False,
    source_ids: Optional[List[int]] = None,
) -> ChatResponse:
    settings = db.query(Settings).filter(Settings.user_id == user_id).first()
    model = model_override or (settings.model_name if settings else "llama-3.3-70b-versatile")
    temperature = settings.temperature if settings else 0.7
    max_tokens = settings.max_tokens if settings else 2048
    top_p = settings.top_p if settings else 0.9
    top_k = settings.top_k if settings else 5
    threshold = settings.similarity_threshold if settings else 0.5

    conv = get_or_create_conversation(conversation_id, user_id, db)
    is_first = db.query(Message).filter(Message.conversation_id == conv.id).count() == 0

    if not skip_user_message:
        user_msg = Message(conversation_id=conv.id, role=MessageRole.USER, content=user_message)
        db.add(user_msg)
        db.commit()

    from sqlalchemy.sql import func

    # User already approved web search and the previous RAG answer said "I don't know" —
    # skip retrieval entirely and go straight to web search.
    if force_web_search and allow_web_search:
        web_result = web_search_and_answer(
            query=user_message, model=model,
            temperature=temperature, max_tokens=max_tokens, top_p=top_p,
        )
        assistant_msg = Message(
            conversation_id=conv.id,
            role=MessageRole.ASSISTANT,
            content=web_result["content"],
            retrieved_chunks=json.dumps([]),
            prompt_tokens=web_result.get("prompt_tokens", 0),
            completion_tokens=web_result.get("completion_tokens", 0),
            response_time_ms=web_result.get("response_time_ms", 0.0),
            from_web=True,
        )
        db.add(assistant_msg)
        conv.updated_at = func.now()
        db.commit()
        if is_first:
            auto_title_conversation(conv, user_message, db)
        db.refresh(assistant_msg)
        return ChatResponse(
            conversation_id=conv.id,
            message_id=assistant_msg.id,
            answer=web_result["content"],
            retrieved_chunks=[],
            prompt_tokens=web_result.get("prompt_tokens", 0),
            completion_tokens=web_result.get("completion_tokens", 0),
            response_time_ms=web_result.get("response_time_ms", 0.0),
            from_web=True,
        )

    chunks, retrieval_time = retrieve_context(
        query=user_message, user_id=user_id, db=db, is_admin=is_admin,
        top_k=top_k, similarity_threshold=threshold, source_ids=source_ids,
    )

    # No relevant context found in documents
    if not passes_rag_guard(chunks):
        # User approved web search — do it
        if allow_web_search:
            web_result = web_search_and_answer(
                query=user_message, model=model,
                temperature=temperature, max_tokens=max_tokens, top_p=top_p,
            )
            assistant_msg = Message(
                conversation_id=conv.id,
                role=MessageRole.ASSISTANT,
                content=web_result["content"],
                rag_context=None,
                retrieved_chunks=json.dumps([]),
                prompt_tokens=web_result.get("prompt_tokens", 0),
                completion_tokens=web_result.get("completion_tokens", 0),
                response_time_ms=web_result.get("response_time_ms", retrieval_time),
                from_web=True,
            )
            db.add(assistant_msg)
            conv.updated_at = func.now()
            db.commit()
            if is_first:
                auto_title_conversation(conv, user_message, db)
            db.refresh(assistant_msg)
            return ChatResponse(
                conversation_id=conv.id,
                message_id=assistant_msg.id,
                answer=web_result["content"],
                retrieved_chunks=[],
                prompt_tokens=web_result.get("prompt_tokens", 0),
                completion_tokens=web_result.get("completion_tokens", 0),
                response_time_ms=web_result.get("response_time_ms", retrieval_time),
                from_web=True,
            )

        # Ask user permission to search the web
        assistant_msg = Message(
            conversation_id=conv.id,
            role=MessageRole.ASSISTANT,
            content=NO_CONTEXT_REPLY,
            rag_context=None,
            retrieved_chunks=json.dumps([]),
            prompt_tokens=0,
            completion_tokens=0,
            response_time_ms=retrieval_time,
        )
        db.add(assistant_msg)
        conv.updated_at = func.now()
        db.commit()
        if is_first:
            auto_title_conversation(conv, user_message, db)
        db.refresh(assistant_msg)
        return ChatResponse(
            conversation_id=conv.id,
            message_id=assistant_msg.id,
            answer=NO_CONTEXT_REPLY,
            retrieved_chunks=[],
            prompt_tokens=0,
            completion_tokens=0,
            response_time_ms=retrieval_time,
            web_search_available=True,
        )

    # Normal RAG answer from documents
    rag_prompt = build_rag_prompt(user_message, chunks)
    llm_result = chat_completion(
        prompt=rag_prompt, model=model,
        temperature=temperature, max_tokens=max_tokens, top_p=top_p,
    )

    answer = llm_result["content"]
    # LLM found chunks but still couldn't answer — offer web search
    no_info = llm_says_no_info(answer)

    assistant_msg = Message(
        conversation_id=conv.id,
        role=MessageRole.ASSISTANT,
        content=answer,
        rag_context=rag_prompt,
        retrieved_chunks=json.dumps(chunks),
        prompt_tokens=llm_result["prompt_tokens"],
        completion_tokens=llm_result["completion_tokens"],
        response_time_ms=llm_result["response_time_ms"],
    )
    db.add(assistant_msg)
    conv.updated_at = func.now()
    db.commit()

    if is_first:
        auto_title_conversation(conv, user_message, db)

    db.refresh(assistant_msg)

    return ChatResponse(
        conversation_id=conv.id,
        message_id=assistant_msg.id,
        answer=answer,
        retrieved_chunks=chunks,
        prompt_tokens=llm_result["prompt_tokens"],
        completion_tokens=llm_result["completion_tokens"],
        response_time_ms=llm_result["response_time_ms"],
        web_search_available=no_info,
    )
