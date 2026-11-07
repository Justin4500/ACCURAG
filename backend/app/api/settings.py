from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User, UserSettings
from app.schemas.settings import UserSettingsUpdate, UserSettingsResponse
from app.core.config import settings

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=UserSettingsResponse)
def get_user_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_settings = current_user.settings
    if not user_settings:
        user_settings = UserSettings(
            id=current_user.id,
            user_id=current_user.id,
            theme="dark",
            ai_provider="gemini",
            chunk_size=600,
            top_k=5
        )
        db.add(user_settings)
        db.commit()
        db.refresh(user_settings)

    return UserSettingsResponse(
        theme=user_settings.theme,
        ai_provider=user_settings.ai_provider,
        has_custom_key=bool(user_settings.custom_gemini_key),
        chunk_size=user_settings.chunk_size,
        top_k=user_settings.top_k,
        system_has_gemini_key=bool(settings.GEMINI_API_KEY)
    )


@router.put("", response_model=UserSettingsResponse)
def update_user_settings(
    req: UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_settings = current_user.settings
    if not user_settings:
        user_settings = UserSettings(
            id=current_user.id,
            user_id=current_user.id
        )
        db.add(user_settings)

    if req.theme is not None:
        user_settings.theme = req.theme
    if req.ai_provider is not None:
        user_settings.ai_provider = req.ai_provider
    if req.custom_gemini_key is not None:
        user_settings.custom_gemini_key = req.custom_gemini_key.strip() or None
    if req.chunk_size is not None:
        user_settings.chunk_size = req.chunk_size
    if req.top_k is not None:
        user_settings.top_k = req.top_k

    db.commit()
    db.refresh(user_settings)

    return UserSettingsResponse(
        theme=user_settings.theme,
        ai_provider=user_settings.ai_provider,
        has_custom_key=bool(user_settings.custom_gemini_key),
        chunk_size=user_settings.chunk_size,
        top_k=user_settings.top_k,
        system_has_gemini_key=bool(settings.GEMINI_API_KEY)
    )
