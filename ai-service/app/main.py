from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import health, summarize, terms
from app.core.config import ALLOW_ORIGINS


def create_app() -> FastAPI:
  application = FastAPI(title="CareConnect 360 AI Service")
  application.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
  )
  application.include_router(health.router)
  application.include_router(summarize.router)
  application.include_router(terms.router)
  return application


app = create_app()
