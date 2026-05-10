import json
from typing import Dict, Optional

from pydantic import BaseModel, field_validator

EXTRA_MEDICAL_TERMS_CAP = 5000


def sanitize_extra_medical_terms_dict(v):
  if v is None:
    return None
  if not isinstance(v, dict):
    return None
  out: Dict[str, str] = {}
  for i, (k, val) in enumerate(v.items()):
    if i >= EXTRA_MEDICAL_TERMS_CAP:
      break
    ks = str(k).strip()
    vs = str(val).strip()
    if ks and vs:
      out[ks] = vs
  return out or None


def parse_extra_medical_terms_json(raw: Optional[str]) -> Optional[Dict[str, str]]:
  """Multipart form field: JSON object of medical_term → simplified_term."""
  if raw is None or not str(raw).strip():
    return None
  try:
    data = json.loads(raw)
  except json.JSONDecodeError:
    return None
  return sanitize_extra_medical_terms_dict(data)


class SummarizeRequest(BaseModel):
  text: str
  max_length: Optional[int] = 150
  min_length: Optional[int] = 50
  extra_medical_terms: Optional[Dict[str, str]] = None

  @field_validator("extra_medical_terms", mode="before")
  @classmethod
  def normalize_extra_medical_terms(cls, v):
    return sanitize_extra_medical_terms_dict(v)


class SummarizeResponse(BaseModel):
  success:          bool
  original_length:  int
  summary:          str
  simplified:       bool
  generation_ms:    int
  generated_at_pkt: str
