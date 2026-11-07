from typing import Optional
from pydantic import BaseModel


class UserSettingsUpdate(BaseModel):
    theme: Optional[str] = None
    ai_provider: Optional[str] = None
    custom_gemini_key: Optional[str] = None
    chunk_size: Optional[int] = None
    top_k: Optional[int] = None


class UserSettingsResponse(BaseModel):
    theme: str
    ai_provider: str
    has_custom_key: bool
    chunk_size: int
    top_k: int
    system_has_gemini_key: bool
