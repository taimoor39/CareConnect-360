from fastapi import APIRouter

from app.services.medical_terms import MEDICAL_TERMS

router = APIRouter(tags=["terms"])


@router.get("/api/terms")
def get_medical_terms():
  return {
    "success": True,
    "count":   len(MEDICAL_TERMS),
    "terms":   MEDICAL_TERMS,
  }
