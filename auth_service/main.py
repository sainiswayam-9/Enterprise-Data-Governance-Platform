"""
Auth Service  –  Port read from .env (AUTH_SERVICE_PORT)
=========================================================
Core authentication and user management service.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth_service.database import get_db, ensure_indexes
from auth_service.routers.auth import router as auth_router
from auth_service.routers.users import router as users_router
from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_indexes()
    yield

app = FastAPI(
    title="RBAC – Auth Service",
    description="Issues and verifies JWTs for the RBAC system.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers: AUTH first (default), then User Management
app.include_router(auth_router)
app.include_router(users_router)


@app.get("/health", tags=["Health"], summary="Health check")
def health():
    """Service health check endpoint."""
    return {"status": "ok", "service": "auth"}



