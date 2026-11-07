import os
import sys
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.database.base import Base
# Import all models to ensure they are registered with Base.metadata
import app.models  # noqa: F401

logger = logging.getLogger("accurate_ai.database")

def create_db_engine():
    db_url = settings.DATABASE_URL
    is_sqlite = db_url.startswith("sqlite")
    is_testing = os.environ.get("TESTING") == "1" or "pytest" in sys.modules
    
    if is_sqlite or is_testing:
        target_url = settings.SQLITE_FALLBACK_URL if is_testing else db_url
        return create_engine(
            target_url,
            connect_args={"check_same_thread": False}
        )
    
    try:
        # Test connecting to configured PostgreSQL
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            connect_args={"connect_timeout": 2}
        )
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info(f"Successfully connected to primary PostgreSQL database at {db_url}")
        return engine
    except Exception as exc:
        logger.warning(
            f"Could not connect to PostgreSQL database ({db_url}): {exc}."
        )
        if settings.FALLBACK_TO_SQLITE_IF_PG_UNAVAILABLE:
            logger.warning(
                f"Falling back to local SQLite at {settings.SQLITE_FALLBACK_URL} to allow application startup. "
                "To use PostgreSQL, ensure the PostgreSQL service is running and configure DATABASE_URL."
            )
            return create_engine(
                settings.SQLITE_FALLBACK_URL,
                connect_args={"check_same_thread": False}
            )
        else:
            raise exc

engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Create all tables defined in Base metadata."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as exc:
        logger.error(f"Error initializing database tables: {exc}")
        raise exc
