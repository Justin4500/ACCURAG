import uuid
from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User, UserProfile, UserSettings
from app.core.security import get_password_hash, verify_password, create_access_token
from app.schemas.auth import UserRegister, Token, UserResponse


class AuthService:
    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email.lower().strip()).first()

    @staticmethod
    def get_by_id(db: Session, user_id: str) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @classmethod
    def register(cls, db: Session, user_in: UserRegister) -> User:
        existing = cls.get_by_email(db, user_in.email)
        if existing:
            raise ValueError("A user with this email address already exists.")

        user_id = str(uuid.uuid4())
        hashed_pw = get_password_hash(user_in.password)

        new_user = User(
            id=user_id,
            email=user_in.email.lower().strip(),
            hashed_password=hashed_pw,
            is_active=True,
            is_superuser=False,
        )
        db.add(new_user)

        # Create Profile
        profile = UserProfile(
            id=str(uuid.uuid4()),
            user_id=user_id,
            full_name=user_in.full_name or user_in.email.split("@")[0].capitalize(),
        )
        db.add(profile)

        # Create Settings
        settings = UserSettings(
            id=str(uuid.uuid4()),
            user_id=user_id,
            theme="dark",
            ai_provider="gemini",
            chunk_size=600,
            top_k=5,
        )
        db.add(settings)

        db.commit()
        db.refresh(new_user)
        return new_user

    @classmethod
    def authenticate(cls, db: Session, email: str, password: str) -> Optional[User]:
        user = cls.get_by_email(db, email)
        if not user:
            return None
        if not user.hashed_password:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    @classmethod
    def create_user_token(cls, user: User) -> Token:
        token_str = create_access_token(subject=user.id)
        user_resp = UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.profile.full_name if user.profile else None,
            avatar_url=user.profile.avatar_url if user.profile else None,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            created_at=user.created_at,
        )
        return Token(access_token=token_str, token_type="bearer", user=user_resp)

    @classmethod
    def reset_password(cls, db: Session, email: str, new_password: str) -> bool:
        user = cls.get_by_email(db, email)
        if not user:
            return False
        user.hashed_password = get_password_hash(new_password)
        db.commit()
        return True
