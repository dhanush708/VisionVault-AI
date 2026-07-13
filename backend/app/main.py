# Author: Dhanush Anbu
# Project: VisionVault AI
"""VisionVault AI — FastAPI Application Entry Point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.logger import setup_logging, get_logger
from app.middleware.logging_middleware import LoggingMiddleware
from app.routers import health
from app.routers import upload
from app.routers import videos
from app.routers import analysis
from app.routers import compression
from app.routers import pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle events."""
    logger = get_logger("main")
    logger.info("VisionVault AI starting up")
    yield
    logger.info("VisionVault AI shutting down")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    settings = get_settings()
    setup_logging()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Enterprise AI-Powered CCTV Video Storage Optimization Platform. Developed by Dhanush Anbu.",
        contact={
            "name": "Dhanush Anbu",
            "url": "https://github.com/dhanush708",
        },
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_middleware(LoggingMiddleware)

    app.include_router(health.router, tags=["Health"])
    app.include_router(upload.router)
    app.include_router(videos.router)
    app.include_router(analysis.router)
    app.include_router(compression.router)
    app.include_router(pipeline.router)

    return app


app = create_app()
