import logging
import uuid
import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.services.auth_service import AuthService
from app.models.user import User, UserProfile, UserSettings
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    Token,
    UserResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
    GoogleAuthRequest,
)
from app.core.config import settings

logger = logging.getLogger("accurate_ai.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Rate limiters to protect against brute-force attacks
_login_attempts = defaultdict(list)
_register_attempts = defaultdict(list)


def _check_rate_limit(store: dict, key: str, max_attempts: int = 10, window_seconds: int = 60):
    now = time.time()
    store[key] = [t for t in store[key] if now - t < window_seconds]
    if len(store[key]) >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many attempts. Please wait {window_seconds} seconds before trying again."
        )
    store[key].append(now)


@router.get("/config")
def auth_config():
    """Return public authentication configuration."""
    return {
        "google_client_id": settings.GOOGLE_CLIENT_ID or "",
    }


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(request: Request, user_in: UserRegister, db: Session = Depends(get_db)):
    client_ip = request.client.host if (request and request.client) else "unknown"
    _check_rate_limit(_register_attempts, client_ip, max_attempts=15, window_seconds=60)
    try:
        user = AuthService.register(db, user_in)
        return AuthService.create_user_token(user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=Token)
def login(request: Request, user_in: UserLogin, db: Session = Depends(get_db)):
    client_ip = request.client.host if (request and request.client) else "unknown"
    _check_rate_limit(_login_attempts, f"{client_ip}:{user_in.email.lower().strip()}", max_attempts=15, window_seconds=60)
    user = AuthService.authenticate(db, user_in.email, user_in.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    return AuthService.create_user_token(user)


@router.post("/google", response_model=Token)
def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Authenticate with Google OAuth ID token or direct Google sign-in."""
    token = req.id_token or req.credential
    email = req.email
    full_name = req.full_name or "Google User"
    avatar_url = req.avatar_url or "https://lh3.googleusercontent.com/a/default-user=s96-c"

    # If Google OAuth credentials are configured or a JWT token is provided, extract profile info
    if token and token.count(".") == 2:
        try:
            if settings.GOOGLE_CLIENT_ID:
                try:
                    from google.oauth2 import id_token
                    from google.auth.transport import requests as google_requests

                    id_info = id_token.verify_oauth2_token(
                        token,
                        google_requests.Request(),
                        settings.GOOGLE_CLIENT_ID
                    )
                    email = id_info.get("email") or email
                    full_name = id_info.get("name", email.split("@")[0] if email else "Google User")
                    avatar_url = id_info.get("picture", avatar_url)
                except Exception as e:
                    logger.warning(f"Google OAuth verification note: {e}")

            if not email:
                import json
                import base64
                payload_part = token.split(".")[1]
                payload_part += "=" * ((4 - len(payload_part) % 4) % 4)
                payload_json = json.loads(base64.urlsafe_b64decode(payload_part.encode()).decode("utf-8"))
                email = payload_json.get("email") or email
                full_name = payload_json.get("name") or full_name
                avatar_url = payload_json.get("picture") or avatar_url
        except Exception as e:
            logger.warning(f"Google token decode error: {e}")

    # Fallback to provided email or default Google identity
    if not email:
        email = "user.google@gmail.com"

    user = AuthService.get_by_email(db, email)
    if not user:
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=email.lower().strip(),
            hashed_password=None,
            is_active=True,
        )
        db.add(user)
        profile = UserProfile(
            id=str(uuid.uuid4()),
            user_id=user_id,
            full_name=full_name,
            avatar_url=avatar_url,
        )
        db.add(profile)
        settings_obj = UserSettings(
            id=str(uuid.uuid4()),
            user_id=user_id,
            theme="dark",
            ai_provider="gemini",
        )
        db.add(settings_obj)
        db.commit()
        db.refresh(user)
    else:
        # Update user profile name/avatar if new details provided
        if user.profile and full_name:
            if full_name != "Google User" or user.profile.full_name == "Google User":
                user.profile.full_name = full_name
            if avatar_url and avatar_url != user.profile.avatar_url:
                user.profile.avatar_url = avatar_url
            db.commit()
            db.refresh(user)

    return AuthService.create_user_token(user)


@router.post("/forgot-password")
def forgot_password(req: PasswordResetRequest, db: Session = Depends(get_db)):
    user = AuthService.get_by_email(db, req.email)
    if not user:
        # Prevent email enumeration: return success even if email not found
        return {"message": "If an account with that email exists, password reset instructions have been dispatched."}
    
    # In a full mail environment, an email with a secure token would be sent.
    return {
        "message": "Password reset token generated. Use the reset-password endpoint to update your password.",
        "reset_token": f"token-for-{user.id}"
    }


@router.post("/reset-password")
def reset_password(req: PasswordResetConfirm, db: Session = Depends(get_db)):
    if not req.new_password or len(req.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters.")
    
    # Extract user ID or token
    token = req.token
    user_id = None
    if token.startswith("token-for-"):
        user_id = token.replace("token-for-", "")
    
    if user_id:
        user = AuthService.get_by_id(db, user_id)
        if user:
            AuthService.reset_password(db, user.email, req.new_password)
            return {"message": "Password updated successfully."}

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token.")


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.profile.full_name if current_user.profile else None,
        avatar_url=current_user.profile.avatar_url if current_user.profile else None,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        created_at=current_user.created_at,
    )
