import os
from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Accurate AI"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/accurate_ai",
        description="PostgreSQL connection string. If unavailable and FALLBACK_TO_SQLITE is true, SQLite is used."
    )
    FALLBACK_TO_SQLITE_IF_PG_UNAVAILABLE: bool = Field(
        default=True,
        description="Gracefully fallback to local SQLite if PostgreSQL service is not reachable on localhost."
    )
    SQLITE_FALLBACK_URL: str = "sqlite:///./data/accurate_ai_fallback.db"

    # Security
    JWT_SECRET_KEY: str = Field(
        default="accurate_ai_super_secret_jwt_key_2026_xyz_production_ready",
        description="Secret key for signing JWT tokens"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # AI & Embeddings
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.5-flash"
    EMBEDDING_PROVIDER: str = "fastembed"
    
    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    # Storage paths
    CHROMA_PERSIST_DIRECTORY: str = "./data/chroma"
    UPLOAD_DIRECTORY: str = "./data/uploads"

    # Document upload limits
    MAX_FILE_SIZE_MB: int = 50
    MAX_PDF_PAGES: int = 500
    MAX_FILES_PER_UPLOAD: int = 5
    MAX_CONCURRENT_DOCUMENT_JOBS: int = 1

    # RAG Settings
    CHUNK_SIZE: int = 600
    CHUNK_OVERLAP: int = 80
    TOP_K_RETRIEVAL: int = 5

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

# Ensure data directories exist
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
os.makedirs(settings.CHROMA_PERSIST_DIRECTORY, exist_ok=True)
