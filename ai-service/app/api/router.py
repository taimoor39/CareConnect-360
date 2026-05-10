"""Aggregates route modules for a single mount on the FastAPI app."""

from fastapi import APIRouter

from app.api.endpoints import health, summarize, terms

root_router = APIRouter()
root_router.include_router(health.router)
root_router.include_router(summarize.router)
root_router.include_router(terms.router)
