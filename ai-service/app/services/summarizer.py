"""BART-large-CNN summarization with chunking + post-hoc medical term simplification."""
import logging
import re
import time
from datetime import datetime

import pytz

from app.core.constants import (
  DEFAULT_TARGET_WORDS,
  MAX_TARGET_WORDS,
  MIN_SUMMARIZE_WORDS,
  MIN_TARGET_WORDS,
  SUMMARIZATION_MODEL_ID,
)
from app.schemas.summarize import SummarizeRequest, SummarizeResponse
from app.services.chunking import split_into_chunks
from app.services.medical_terms import apply_terms

PKT_TZ = pytz.timezone("Asia/Karachi")
logger = logging.getLogger(__name__)

_summarizer = None
_summarizer_failed = False
_summarizer_error = ""


def get_summarizer():
  global _summarizer, _summarizer_failed, _summarizer_error
  if _summarizer_failed:
    return None
  if _summarizer is None:
    logger.info("Loading BART model — first load only...")
    start = time.time()
    try:
      from transformers import pipeline

      _summarizer = pipeline(
        "summarization",
        model=SUMMARIZATION_MODEL_ID,
        device=-1,
        framework="pt",
      )
      logger.info("Model loaded in %.1fs", time.time() - start)
    except Exception as e:
      _summarizer_failed = True
      _summarizer_error = str(e)
      logger.error("Model unavailable, using fallback: %s", _summarizer_error)
  return _summarizer


def _bart_params(target_words_chunk: int) -> tuple[int, int]:
  """Map word budget to BART max/min token lengths (min well below max)."""
  max_len = max(80, min(256, int(target_words_chunk * 1.35)))
  min_len = max(20, min(int(max_len * 0.4), max_len - 30))
  return max_len, min_len


def _run_bart(summarizer, text: str, max_len: int, min_len: int) -> str:
  result = summarizer(
    text,
    max_length=max_len,
    min_length=min_len,
    do_sample=False,
    truncation=True,
    no_repeat_ngram_size=3,
    early_stopping=True,
    num_beams=4,
  )
  return result[0]["summary_text"]


def fallback_summarize(text: str, target_words: int = 200) -> str:
  cleaned = re.sub(r"\s+", " ", text or "").strip()
  if not cleaned:
    return ""
  parts = re.split(r"(?<=[.!?])\s+", cleaned)
  summary = ""
  max_chars = target_words * 6
  for part in parts:
    if not part:
      continue
    candidate = f"{summary} {part}".strip() if summary else part
    if len(candidate.split()) > target_words:
      break
    summary = candidate
  if not summary:
    summary = " ".join(cleaned.split()[:target_words])
  return summary


def summarize_chunks(chunks: list[str], target_words_total: int = 200) -> str:
  summarizer = get_summarizer()
  if summarizer is None:
    return fallback_summarize(" ".join(chunks), target_words_total)

  summaries: list[str] = []
  words_per_chunk = max(40, min(120, target_words_total // max(len(chunks), 1)))

  for i, chunk in enumerate(chunks):
    try:
      logger.info("Summarizing chunk %s/%s (%s chars)", i + 1, len(chunks), len(chunk))
      if len(chunk.split()) < 20:
        summaries.append(chunk)
        continue
      max_len, min_len = _bart_params(words_per_chunk)
      summaries.append(_run_bart(summarizer, chunk, max_len, min_len))
    except Exception as e:
      logger.error("Chunk %s failed: %s", i + 1, e)
      summaries.append(" ".join(chunk.split()[:150]) + "...")

  if len(summaries) == 1:
    return summaries[0]

  merged = " ".join(summaries)
  word_count = len(merged.split())
  if word_count <= int(target_words_total * 1.5):
    return merged

  logger.info("Merged summary %s words — final compression pass", word_count)
  try:
    final_max, final_min = _bart_params(target_words_total)
    return _run_bart(summarizer, merged, final_max, final_min)
  except Exception as e:
    logger.error("Final compression failed: %s", e)
    return " ".join(merged.split()[:target_words_total])


def summarizer_health_snapshot():
  return {
    "model_loaded": _summarizer is not None,
    "fallback_active": _summarizer_failed,
    "version": "2.0.0",
  }


def _clamp_target_words(value: int | None) -> int:
  target = int(value or DEFAULT_TARGET_WORDS)
  return max(MIN_TARGET_WORDS, min(MAX_TARGET_WORDS, target))


async def summarize_report(request: SummarizeRequest) -> SummarizeResponse:
  text = request.text.strip()
  word_count = len(text.split())
  if word_count < MIN_SUMMARIZE_WORDS:
    raise ValueError(
      f"Report too brief for meaningful summarization (minimum {MIN_SUMMARIZE_WORDS} words)."
    )

  target_words = _clamp_target_words(request.target_words)
  admin_terms = request.resolved_admin_terms()

  start = time.time()
  chunks = split_into_chunks(text, max_tokens=900)
  logger.info("Summarization: %s words, %s chunks", word_count, len(chunks))

  raw_summary = summarize_chunks(chunks, target_words_total=target_words)
  term_result = apply_terms(raw_summary, extra_terms=admin_terms)
  simplified_summary = term_result["simplified_text"]
  replacements = term_result["replacements_made"]

  generation_ms = int((time.time() - start) * 1000)
  generated_at_pkt = datetime.now(PKT_TZ).strftime("%Y-%m-%d %H:%M:%S")
  summary_words = len(simplified_summary.split())

  logger.info(
    "Done: %s words summary, %s replacements, %sms",
    summary_words,
    len(replacements),
    generation_ms,
  )

  return SummarizeResponse(
    success=True,
    original_length=len(request.text),
    original_words=word_count,
    summary=simplified_summary,
    summary_words=summary_words,
    chunks_processed=len(chunks),
    simplified=True,
    replacements_made=replacements,
    generation_ms=generation_ms,
    generated_at_pkt=generated_at_pkt,
    model=SUMMARIZATION_MODEL_ID,
  )
