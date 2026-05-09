from fastapi import APIRouter

from app.services.summarizer import summarizer_health_snapshot

router = APIRouter(tags=["health"])


@router.get("/api/health")
def health_check():
  snap = summarizer_health_snapshot()
  return {
    "status":  "online",
    "service": "CareConnect 360 AI Service",
    "model":   "facebook/bart-large-cnn",
    **snap,
  }
