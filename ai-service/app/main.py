"""FastAPI application — mounts all AI routes and warms up the BART model at startup."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import root_router
from app.core.config import ALLOW_ORIGINS

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
  from app.services.summarizer import warmup_summarizer
  warmup_summarizer(block=False)   # kick off model load; don't block HTTP bind
  yield


def create_app() -> FastAPI:
  app = FastAPI(title="CareConnect 360 AI Service", lifespan=lifespan)
  app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
  )
  app.include_router(root_router)
  return app


app = create_app()
