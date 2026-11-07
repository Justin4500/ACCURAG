import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.database.session import init_db
from app.api.router import api_router

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s"
)
logger = logging.getLogger("accurate_ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.PROJECT_NAME} backend...")
    if os.environ.get("TESTING") != "1":
        init_db()
    if settings.JWT_SECRET_KEY == "accurate_ai_super_secret_jwt_key_2026_xyz_production_ready":
        logger.warning(
            "SECURITY NOTICE: Default JWT_SECRET_KEY is in use. "
            "For production deployments, generate a unique random key (e.g. 'openssl rand -hex 32') in .env"
        )
    logger.info(f"{settings.PROJECT_NAME} initialized successfully.")
    yield
    # Shutdown
    logger.info(f"Shutting down {settings.PROJECT_NAME} backend.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="High-precision AI Document Question-Answering platform with grounded citations.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Enforce defense-in-depth HTTP security headers."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
    return response


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": "1.0.0",
        "ai_configured": bool(settings.GEMINI_API_KEY)
    }


@app.get("/api/health", tags=["Health"])
def api_health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": "1.0.0",
        "ai_configured": bool(settings.GEMINI_API_KEY)
    }


# Include API routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."}
    )
