"""FastAPI application factory — mount point for all AI HTTP routes (summarize, health, terms)."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import root_router
from app.core.config import ALLOW_ORIGINS


def create_app() -> FastAPI:
  application = FastAPI(title="CareConnect 360 AI Service")
  application.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
  )
  application.include_router(root_router)
  return application


app = create_app()
