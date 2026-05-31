from fastapi import APIRouter

from app.services.medical_terms import MEDICAL_TERMS, get_python_terms

router = APIRouter(tags=["terms"])


@router.get("/api/terms")
def get_medical_terms():
  terms = get_python_terms()
  return {
    "success": True,
    "source": "python_dictionary",
    "count": len(terms),
    "terms": MEDICAL_TERMS,
    "note": (
      "Admin-defined terms in MongoDB are applied at summarization time "
      "and take priority over these defaults."
    ),
  }
