from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
from app.api.collections import router as collections_router
from app.api.chat import router as chat_router
from app.api.rag import router as rag_router
from app.api.settings import router as settings_router
from app.api.analytics import router as analytics_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(documents_router)
api_router.include_router(collections_router)
api_router.include_router(chat_router)
api_router.include_router(rag_router)
api_router.include_router(settings_router)
api_router.include_router(analytics_router)
