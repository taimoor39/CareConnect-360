from fastapi import APIRouter

from app.core.constants import SUMMARIZATION_MODEL_ID

router = APIRouter(tags=["health"])


@router.get("/api/health")
def health_check():
  from app.services.summarizer import summarizer_health_snapshot

  snap = summarizer_health_snapshot()
  service_status = "online" if snap.get("model_loaded") or snap.get("model_loading") else "degraded"
  return {
    "status": service_status,
    "service": "CareConnect 360 AI Service",
    "model": SUMMARIZATION_MODEL_ID,
    **snap,
  }
