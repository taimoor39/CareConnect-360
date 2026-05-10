"""BART-large-CNN summarization + deterministic medical phrase substitution (built-ins + optional Mongo map)."""
import time
import re
from datetime import datetime

import pytz

from app.core.constants import MAX_SUMMARIZE_INPUT_CHARS, SUMMARIZATION_MODEL_ID
from app.schemas.summarize import SummarizeRequest, SummarizeResponse
from app.services.medical_terms import simplify_medical_terms

PKT_TZ = pytz.timezone("Asia/Karachi")

_summarizer = None
_summarizer_failed = False
_summarizer_error = ""


def get_summarizer():
  global _summarizer, _summarizer_failed, _summarizer_error
  if _summarizer_failed:
    return None
  if _summarizer is None:
    print("[AI] Loading BART model...")
    start = time.time()
    try:
      from transformers import pipeline
      _summarizer = pipeline(
        "summarization",
        model=SUMMARIZATION_MODEL_ID,
        device=-1,
      )
      print(f"[AI] Model loaded in {time.time()-start:.1f}s")
    except Exception as e:
      _summarizer_failed = True
      _summarizer_error = str(e)
      print(f"[AI] Model unavailable, using fallback summarizer. Error: {_summarizer_error}")
  return _summarizer


def fallback_summarize(text: str, max_length: int = 150, min_length: int = 50) -> str:
  cleaned = re.sub(r'\s+', ' ', text or '').strip()
  if not cleaned:
    return ""
  parts = re.split(r'(?<=[.!?])\s+', cleaned)
  summary = ""
  for part in parts:
    if not part:
      continue
    candidate = f"{summary} {part}".strip() if summary else part
    if len(candidate) > max_length:
      break
    summary = candidate
  if len(summary) < min_length:
    summary = cleaned[:max_length].strip()
  return summary


def summarizer_health_snapshot():
  return {
    "model_loaded": _summarizer is not None,
    "fallback_active": _summarizer_failed,
  }


async def summarize_report(request: SummarizeRequest) -> SummarizeResponse:
  text = request.text.strip()

  if len(text) > MAX_SUMMARIZE_INPUT_CHARS:
    text = text[:MAX_SUMMARIZE_INPUT_CHARS] + "..."

  start = time.time()
  summarizer = get_summarizer()
  if summarizer is None:
    raw_summary = fallback_summarize(
      text,
      max_length=request.max_length or 150,
      min_length=request.min_length or 50,
    )
  else:
    result = summarizer(
      text,
      max_length=request.max_length,
      min_length=request.min_length,
      do_sample=False,
    )
    raw_summary = result[0]['summary_text']
  simplified_summary = simplify_medical_terms(
    raw_summary,
    request.extra_medical_terms,
  )
  generation_ms = int((time.time() - start) * 1000)
  generated_at_pkt = datetime.now(PKT_TZ).strftime("%Y-%m-%d %H:%M:%S")

  return SummarizeResponse(
    success=True,
    original_length=len(request.text),
    summary=simplified_summary,
    simplified=True,
    generation_ms=generation_ms,
    generated_at_pkt=generated_at_pkt,
  )
