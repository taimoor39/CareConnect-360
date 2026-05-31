import json
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

EXTRA_MEDICAL_TERMS_CAP = 5000


def sanitize_extra_medical_terms_dict(v: Any) -> Optional[Dict[str, str]]:
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


class ReplacementRecord(BaseModel):
  original: str
  replacement: str


class SummarizeRequest(BaseModel):
  text: str
  target_words: Optional[int] = 200
  max_length: Optional[int] = None
  min_length: Optional[int] = None
  extra_medical_terms: Optional[Dict[str, str]] = None
  admin_terms: Optional[Dict[str, str]] = None

  @field_validator("extra_medical_terms", "admin_terms", mode="before")
  @classmethod
  def normalize_term_maps(cls, v):
    return sanitize_extra_medical_terms_dict(v)

  def resolved_admin_terms(self) -> Optional[Dict[str, str]]:
    merged: Dict[str, str] = {}
    if self.extra_medical_terms:
      merged.update(self.extra_medical_terms)
    if self.admin_terms:
      merged.update(self.admin_terms)
    return merged or None


class SummarizeResponse(BaseModel):
  success: bool
  original_length: int
  original_words: int = 0
  summary: str
  summary_words: int = 0
  chunks_processed: int = 1
  simplified: bool
  replacements_made: List[ReplacementRecord] = Field(default_factory=list)
  generation_ms: int
  generated_at_pkt: str = ""
  model: str = "facebook/bart-large-cnn"
