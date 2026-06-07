from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.auth.jwt_handler import get_current_admin
from app.models.models import User, Document, Conversation, Message, UserRole
from app.schemas.schemas import AdminUserOut, DocumentOut, ConversationOut

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=List[AdminUserOut])
def list_all_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.get("/documents", response_model=List[DocumentOut])
def list_all_documents(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    docs = db.query(Document).order_by(Document.upload_date.desc()).all()
    return [DocumentOut.model_validate(d) for d in docs]


@router.get("/conversations", response_model=List[ConversationOut])
def list_all_conversations(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    convs = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    result = []
    for conv in convs:
        msg_count = db.query(Message).filter(Message.conversation_id == conv.id).count()
        out = ConversationOut.model_validate(conv)
        out.message_count = msg_count
        result.append(out)
    return result


@router.patch("/users/{user_id}/role", response_model=AdminUserOut)
def update_user_role(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        user.role = UserRole(role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {[r.value for r in UserRole]}")
    db.commit()
    db.refresh(user)
    return AdminUserOut.model_validate(user)


@router.patch("/users/{user_id}/deactivate", response_model=AdminUserOut)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    db.refresh(user)
    return AdminUserOut.model_validate(user)
