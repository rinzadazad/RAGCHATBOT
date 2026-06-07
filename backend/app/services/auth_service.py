from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.models import User, Settings
from app.schemas.schemas import UserCreate
from app.auth.jwt_handler import hash_password, verify_password, create_access_token


def register_user(user_data: UserCreate, db: Session) -> User:
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
    )
    db.add(user)
    db.flush()

    default_settings = Settings(user_id=user.id)
    db.add(default_settings)
    db.commit()
    db.refresh(user)
    return user


def login_user(email: str, password: str, db: Session) -> tuple[User, str]:
    user = db.query(User).filter(User.email == email, User.is_active == True).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(data={"sub": str(user.id)})
    return user, token
