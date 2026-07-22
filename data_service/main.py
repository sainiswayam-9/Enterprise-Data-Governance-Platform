"""
Data Service  –  Port read from .env (DATA_SERVICE_PORT)
=========================================================
CRUD operations on CSV data files with role-based access.
JWT tokens issued by the Auth Service are verified locally
using the shared SECRET_KEY — no extra service call needed.

Endpoints:
  /data/categories            → list categories
  /data/                       → list all categories with row counts
  /data/upload                → upload CSV/Excel file
  /data/read/{category}       → read data from category
  /data/{category}/{row_id}   → read/update/delete row
  /data/change-requests/my    → view own change requests (salesperson)
  /data/change-requests/all   → view all change requests (manager)
  /data/change-requests/{id}/resolve → resolve request (manager)
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from data_service.database import ensure_indexes
from data_service.routers.data import router as data_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_indexes()
    yield

app = FastAPI(
    title="RBAC – Data Service",
    description=(
        "CRUD on CSV data files with role-based access control.\n\n"
        "**Roles:**\n"
        "- `manager`     — full CRUD on all categories\n"
        "- `salesperson` — upload & read; submit change requests for update/delete\n"
        "- `hr`          — read-only on data\n\n"
        "**Note:** User management endpoints are in the Auth Service.\n\n"
        "All endpoints require `Authorization: Bearer <JWT>`."
    ),
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


app.include_router(data_router)


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "data"}
