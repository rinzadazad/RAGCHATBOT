from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.database import get_db
from app.auth.jwt_handler import get_current_user
from app.models.models import User, Conversation, Message
from app.schemas.schemas import SearchResponse, SearchResult

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/chats", response_model=SearchResponse)
def search_chats(
    q: str = Query(..., min_length=1, max_length=200),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    search_term = f"%{q}%"

    query = (
        db.query(Message, Conversation)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .filter(
            Conversation.user_id == current_user.id,
            or_(
                Message.content.ilike(search_term),
                Conversation.title.ilike(search_term),
            ),
        )
        .order_by(Message.timestamp.desc())
    )

    total = query.count()
    offset = (page - 1) * page_size
    results_raw = query.offset(offset).limit(page_size).all()

    results = []
    for msg, conv in results_raw:
        snippet = msg.content
        if len(snippet) > 200:
            idx = snippet.lower().find(q.lower())
            if idx >= 0:
                start = max(0, idx - 50)
                end = min(len(snippet), idx + 150)
                snippet = ("..." if start > 0 else "") + snippet[start:end] + ("..." if end < len(snippet) else "")
            else:
                snippet = snippet[:200] + "..."

        results.append(
            SearchResult(
                conversation_id=conv.id,
                conversation_title=conv.title,
                message_id=msg.id,
                role=msg.role.value,
                content_snippet=snippet,
                timestamp=msg.timestamp,
            )
        )

    return SearchResponse(results=results, total=total, page=page, page_size=page_size)
