from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.auth.jwt_handler import get_current_user
from app.models.models import User, Settings
from app.schemas.schemas import SettingsOut, SettingsUpdate
from app.services.llm_service import get_available_models

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=SettingsOut)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = db.query(Settings).filter(Settings.user_id == current_user.id).first()
    if not settings:
        settings = Settings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return SettingsOut.model_validate(settings)


@router.put("", response_model=SettingsOut)
def update_settings(
    update: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = db.query(Settings).filter(Settings.user_id == current_user.id).first()
    if not settings:
        settings = Settings(user_id=current_user.id)
        db.add(settings)

    for field, value in update.model_dump(exclude_none=True).items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    return SettingsOut.model_validate(settings)


@router.get("/models")
def list_models():
    return {"models": get_available_models()}
