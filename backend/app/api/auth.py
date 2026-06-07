from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.schemas import UserCreate, UserLogin, Token, UserOut
from app.services.auth_service import register_user, login_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=201)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    user = register_user(user_data, db)
    from app.auth.jwt_handler import create_access_token
    token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user, token = login_user(credentials.email, credentials.password, db)
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}
