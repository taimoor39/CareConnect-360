"""
Medical report summarization — DistilBART on CPU.

Design:
  - Model weights load once at startup in a daemon thread.
  - Summarize requests wait for the model (up to REQUEST_MODEL_WAIT_SEC).
  - A hard per-request wall-clock cap prevents BART from blocking forever.
  - If BART times out or fails, a fast extractive fallback is returned.
  - Inference always runs off the asyncio event loop so the HTTP server stays responsive.
"""

from __future__ import annotations

import asyncio
import logging
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

import pytz

from app.core.constants import (
  BART_EARLY_STOPPING,
  BART_INFERENCE_TIMEOUT_SEC,
  BART_LENGTH_PENALTY,
  BART_MAX_NEW_TOKENS,
  BART_MIN_LENGTH,
  BART_NO_REPEAT_NGRAM_SIZE,
  BART_NUM_BEAMS,
  BART_SAFE_CHUNK_TOKENS,
  DEFAULT_TARGET_WORDS,
  MAX_TARGET_WORDS,
  MIN_TARGET_WORDS,
  MODEL_LOAD_TIMEOUT_SEC,
  REQUEST_MODEL_WAIT_SEC,
  SUMMARIZATION_MODEL_ID,
)
from app.schemas.summarize import SummarizeRequest, SummarizeResponse
from app.services.medical_dictionary import apply_medical_dictionary
from app.services.medical_terms import get_python_terms
from app.services.token_guard import (
  prepare_text_for_bart,
  set_shared_tokenizer,
  validate_and_prepare_input,
)

PKT_TZ = pytz.timezone("Asia/Karachi")
logger = logging.getLogger(__name__)

# ── Global model state ────────────────────────────────────────────────────────
_model = None
_tokenizer = None
_model_failed = False
_model_error = ""
_model_loading = False
_load_lock = threading.Lock()

# Single-thread pool for model loading — reused across restarts.
_load_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="bart-load")


# ── Model loading ─────────────────────────────────────────────────────────────

def _load_bart_sync():
  """Download (once) and load BART weights into CPU memory."""
  import os

  import torch
  from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

  # Intra-op parallelism: up to 4 threads within a single operation.
  cpu_count = os.cpu_count() or 2
  torch.set_num_threads(min(4, cpu_count))
  # Inter-op parallelism: serialise the operation graph.
  # Multiple inter-op threads cause thread-pool contention during single-request
  # CPU inference and consistently slow BART down — setting to 1 is the
  # standard PyTorch recommendation for inference-only workloads.
  torch.set_num_interop_threads(1)
  tokenizer = AutoTokenizer.from_pretrained(SUMMARIZATION_MODEL_ID)
  model = AutoModelForSeq2SeqLM.from_pretrained(SUMMARIZATION_MODEL_ID)
  model.eval()
  return model, tokenizer


def _start_background_load() -> None:
  global _model_loading
  with _load_lock:
    if _model is not None or _model_failed or _model_loading:
      return
    _model_loading = True

  def _worker():
    global _model, _tokenizer, _model_failed, _model_error, _model_loading
    try:
      logger.info("Loading model: %s", SUMMARIZATION_MODEL_ID)
      t0 = time.time()
      model, tokenizer = _load_bart_sync()
      _model = model
      _tokenizer = tokenizer
      set_shared_tokenizer(tokenizer)
      logger.info("Model ready in %.1fs", time.time() - t0)
    except Exception as exc:
      _model_failed = True
      _model_error = str(exc)
      logger.error("Model load failed: %s", exc)
    finally:
      _model_loading = False

  try:
    _load_executor.submit(_worker)
  except RuntimeError:
    # Executor was shut down (e.g. port-conflict restart) — reset and retry once.
    _model_loading = False
    logger.warning("Load executor was shut down; model will load on first request")


def _ensure_load_started() -> None:
  if _model is None and not _model_failed and not _model_loading:
    _start_background_load()


def wait_for_model_ready(timeout_sec: float | None = None) -> bool:
  """Block until model is loaded, failed, or the timeout is reached."""
  _ensure_load_started()
  if _model is not None or _model_failed:
    return _model is not None

  limit = timeout_sec if timeout_sec is not None else MODEL_LOAD_TIMEOUT_SEC
  deadline = time.monotonic() + limit
  while time.monotonic() < deadline:
    if _model is not None:
      return True
    if _model_failed or not _model_loading:
      break
    time.sleep(0.25)
  return _model is not None


# ── BART inference ────────────────────────────────────────────────────────────

def _generate_kwargs() -> dict:
  return {
    "max_new_tokens": BART_MAX_NEW_TOKENS,
    "min_length": BART_MIN_LENGTH,
    "num_beams": BART_NUM_BEAMS,
    "no_repeat_ngram_size": BART_NO_REPEAT_NGRAM_SIZE,
    "length_penalty": BART_LENGTH_PENALTY,
    "early_stopping": BART_EARLY_STOPPING,
    "do_sample": False,
  }


def _run_bart(model, tokenizer, text: str) -> str:
  import torch

  enc = tokenizer(text, max_length=BART_SAFE_CHUNK_TOKENS, truncation=True, return_tensors="pt")
  with torch.inference_mode():
    ids = model.generate(enc["input_ids"], attention_mask=enc.get("attention_mask"), **_generate_kwargs())
  return tokenizer.decode(ids[0], skip_special_tokens=True, clean_up_tokenization_spaces=True)


def _run_bart_bounded(model, tokenizer, text: str) -> str | None:
  """Run BART with a hard wall-clock cap; returns None on timeout."""
  pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="bart-gen")
  fut = pool.submit(_run_bart, model, tokenizer, text)
  try:
    return fut.result(timeout=BART_INFERENCE_TIMEOUT_SEC)
  except Exception:
    logger.warning("BART inference exceeded %ss cap — using extractive fallback", BART_INFERENCE_TIMEOUT_SEC)
    return None
  finally:
    pool.shutdown(wait=False, cancel_futures=True)


# ── Input / output cleaning ───────────────────────────────────────────────────

# Patterns that mark non-clinical trailing content (educational notes, disclaimers).
_DISCLAIMER_RE = re.compile(
  r"\n?\s*\b(?:Note|Disclaimer|Disclaimer note|Important note)\s*:\s*.+$",
  re.IGNORECASE | re.DOTALL,
)

# Matches parenthetical explanations embedded in source reports, e.g.:
#   "dyspnea (difficulty breathing)"  →  "dyspnea"
# Min 3 / max 120 chars inside parens; single-line only (avoids stripping
# compound-sentence constructs that happen to span parentheses across lines).
_INPUT_PAREN_RE = re.compile(r"\s*\([^)\n]{3,120}\)")

# Matches numbered section headers: "1. Chief Complaint & History of Present Illness"
# Only matches lines whose ENTIRE content is the header title (no colon-content after).
_NUMBERED_HEADER_RE = re.compile(
  r"^\s*\d+\.\s+[A-Za-z &/()'\":\-]{5,80}\s*$",
  re.MULTILINE,
)

# Matches standalone subsection heading lines ending with a bare colon:
#   "Lab Work (Serum Analysis):"   "Assessment:"   "Electrocardiogram (ECG):"
# Does NOT match lines like "Glucose: Elevated, …" (content after the colon).
_STANDALONE_SUBHEADER_RE = re.compile(
  r"^[A-Z][A-Za-z\s()&/'\-]{3,60}:\s*$",
  re.MULTILINE,
)


def _strip_disclaimers(text: str) -> str:
  """Remove trailing Note/Disclaimer paragraphs that confuse BART's coverage."""
  return _DISCLAIMER_RE.sub("", text).strip()


def _strip_section_headers(text: str) -> str:
  """
  Remove document-structure headers before encoding for BART.

  DistilBART was trained on continuous news-article prose (CNN/DailyMail).
  When it sees numbered section headers like "1. Chief Complaint & HPI" or
  subsection labels like "Lab Work (Serum Analysis):", it treats them as
  content to summarise — wasting decode tokens on titles instead of findings.

  Stripping them before encoding:
    • Reduces encoder input by ~30 tokens on a typical 350-word medical report
    • Removes BART's tendency to reproduce heading phrases verbatim in output
    • Gives cleaner prose context so multi-section coverage improves

  Conservative matching: only lines whose ENTIRE content is a header are
  removed.  Lines with clinical content after the colon are preserved.
  """
  text = _NUMBERED_HEADER_RE.sub("", text)
  text = _STANDALONE_SUBHEADER_RE.sub("", text)
  # Collapse blank lines left by header removal
  text = re.sub(r"\n{3,}", "\n\n", text)
  return text.strip()


def _strip_parentheticals_from_input(text: str) -> str:
  """
  Remove inline lay-language translations from the report BEFORE it reaches BART.

  Medical reports often self-explain every technical term:
    "tachycardia (fast heart rate)"
    "pulmonary embolism (a blocked blood vessel in the lungs)"

  When BART copies these into the summary our medical dictionary then replaces
  the medical term but leaves the dangling parenthetical, creating doubles:
    "fast heart rate (fast heart rate)"
    "blood clot in lungs (a blocked blood vessel in the lungs)"

  Stripping them here keeps the medical term intact (our dictionary translates it
  cleanly) and removes the source of the leakage entirely.

  Also strips PDF bullet-point artefacts (•, ·, "o ") that waste BART tokens.
  """
  cleaned = _INPUT_PAREN_RE.sub("", text)
  # Remove PDF/Word bullet artefacts
  cleaned = re.sub(r"^\s*[•·○◦]\s*", "", cleaned, flags=re.MULTILINE)
  cleaned = re.sub(r"^\s*o\s+", "", cleaned, flags=re.MULTILINE)
  # Collapse runs of spaces / blank lines introduced by the removals
  cleaned = re.sub(r" {2,}", " ", cleaned)
  cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
  return cleaned.strip()


def _post_clean_summary(text: str) -> str:
  """
  Final cleanup applied to the BART summary AFTER medical-dictionary substitution.

  Guards against:
  • Parenthetical fragments that survived pre-processing (very long or
    BART-generated parentheticals from CNN/DailyMail training patterns).
  • Duplicate consecutive words ("blood blood", "the the") from substitution
    edge-cases.
  • Numbered section markers ("1.", "2.") that BART occasionally echoes.
  • Orphaned colons / isolated short tokens left after header removal.
  • Stray bullet artefacts.
  • Missing terminal punctuation.
  """
  # Strip any remaining parentheticals (catches BART-native ones > 120 chars cutoff)
  text = re.sub(r"\s*\([^)]{3,120}\)", "", text)
  # Remove numbered list markers BART may reproduce ("1. ", "2. " at line/sentence start)
  text = re.sub(r"(^|\.\s+)\d+\.\s+", r"\1", text)
  # Remove orphaned colons (e.g. "Assessment:" left after header strip reaches summary)
  text = re.sub(r"\b[A-Za-z][A-Za-z\s]{2,30}:\s*(?=[A-Z])", "", text)
  # Collapse duplicate consecutive words produced by dictionary substitution
  text = re.sub(r"\b(\w+)\s+\1\b", r"\1", text, flags=re.IGNORECASE)
  # Remove stray bullet and list-marker artefacts
  text = re.sub(r"[•·○◦]\s*", " ", text)
  text = re.sub(r"^\s*o\s+", "", text, flags=re.MULTILINE)
  # Ensure sentences don't start with a lowercase word (artefact of mid-sentence splicing)
  text = re.sub(r"(?<=[.!?]\s)([a-z])", lambda m: m.group(1).upper(), text)
  # Normalise whitespace; fold newlines into a single flowing paragraph
  text = re.sub(r" {2,}", " ", text)
  text = re.sub(r"\n{1,}", " ", text)
  text = text.strip()
  if text and text[-1] not in ".!?":
    text += "."
  return text


def _fix_sentence_punctuation(text: str) -> str:
  """
  BART sometimes omits periods at sentence boundaries.
  Insert '. ' when a lowercase word is directly followed by an uppercase word
  (skipping common abbreviations and known multi-word patterns).
  """
  # Add period before a capitalised word that follows a lowercase word with no punctuation.
  text = re.sub(r"([a-z])\s+([A-Z][a-z])", r"\1. \2", text)
  # Ensure the summary ends with terminal punctuation.
  text = text.strip()
  if text and text[-1] not in ".!?":
    text += "."
  return text


# ── Extractive fallback ───────────────────────────────────────────────────────

def _extractive_fallback(text: str, target_words: int = DEFAULT_TARGET_WORDS) -> str:
  """Pick leading sentences up to target_words."""
  cleaned = re.sub(r"\s+", " ", text or "").strip()
  if not cleaned:
    return ""
  summary = ""
  for sentence in re.split(r"(?<=[.!?])\s+", cleaned):
    if not sentence:
      continue
    candidate = f"{summary} {sentence}".strip() if summary else sentence
    if len(candidate.split()) > target_words:
      break
    summary = candidate
  return summary or " ".join(cleaned.split()[:target_words])


# ── Public summarize API ──────────────────────────────────────────────────────

def summarize_text(text: str, target_words: int = DEFAULT_TARGET_WORDS) -> tuple[str, str]:
  """
  Returns (summary_text, model_label).
  Waits for model load; falls back to extractive on failure or timeout.
  """
  if not wait_for_model_ready(timeout_sec=REQUEST_MODEL_WAIT_SEC):
    if _model_failed:
      logger.warning("Model failed — extractive fallback: %s", _model_error)
      return _extractive_fallback(text, target_words), "extractive-fallback"
    raise RuntimeError(
      "Summarization model is still loading. "
      "Please wait and try again, or check /api/health."
    )

  clean_text = _strip_disclaimers(text)
  clean_text = _strip_section_headers(clean_text)
  clean_text = _strip_parentheticals_from_input(clean_text)
  logger.info("BART input after pre-processing: %d words", len(clean_text.split()))
  safe_text = prepare_text_for_bart(clean_text, _tokenizer, BART_SAFE_CHUNK_TOKENS)
  t0 = time.monotonic()
  result = _run_bart_bounded(_model, _tokenizer, safe_text)
  elapsed = time.monotonic() - t0

  if not result:
    return _extractive_fallback(safe_text, target_words), "extractive-fallback"

  result = _fix_sentence_punctuation(result)
  logger.info("BART: %.1fs | %d → %d words", elapsed, len(safe_text.split()), len(result.split()))
  return result, SUMMARIZATION_MODEL_ID


def warmup_summarizer(block: bool = False) -> None:
  """Start model load at app startup. Non-blocking by default."""
  _ensure_load_started()
  if block:
    ready = wait_for_model_ready()
    if ready:
      logger.info("Warmup done — %s", SUMMARIZATION_MODEL_ID)
    elif _model_failed:
      logger.warning("Warmup failed: %s", _model_error)
    else:
      logger.warning("Warmup timed out — model will load on first request")


def summarizer_status() -> dict:
  status = "ready" if _model else ("loading" if _model_loading else ("failed" if _model_failed else "idle"))
  return {
    "status": status,
    "model_loaded": _model is not None,
    "model_loading": _model_loading,
    "fallback_active": _model_failed,
    "model_id": SUMMARIZATION_MODEL_ID,
    "model_error": _model_error or None,
  }


# Keep old name for health endpoint.
summarizer_health_snapshot = summarizer_status


# ── Async entry point ─────────────────────────────────────────────────────────

_infer_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="bart-infer")


def _clamp_target_words(value: int | None) -> int:
  return max(MIN_TARGET_WORDS, min(MAX_TARGET_WORDS, int(value or DEFAULT_TARGET_WORDS)))


async def summarize_report(request: SummarizeRequest) -> SummarizeResponse:
  prepared_text, word_count, _ = validate_and_prepare_input(request.text)
  target_words = _clamp_target_words(request.target_words)
  admin_terms = request.resolved_admin_terms() or {}

  t0 = time.monotonic()
  loop = asyncio.get_running_loop()
  try:
    bart_summary, model_label = await loop.run_in_executor(
      _infer_executor,
      lambda: summarize_text(prepared_text, target_words),
    )
  except RuntimeError as exc:
    raise ValueError(str(exc)) from exc

  term_result = apply_medical_dictionary(bart_summary, get_python_terms(), admin_terms)
  # Final cleanup: strip any residual parentheticals + collapse artefacts
  term_result["simplified_text"] = _post_clean_summary(term_result["simplified_text"])
  generation_ms = int((time.monotonic() - t0) * 1000)
  logger.info("Summarize done in %dms via %s", generation_ms, model_label)

  return SummarizeResponse(
    success=True,
    original_length=len(request.text),
    original_words=word_count,
    summary=term_result["simplified_text"],
    summary_words=len(term_result["simplified_text"].split()),
    chunks_processed=1,
    simplified=True,
    replacements_made=term_result["replacements_made"],
    generation_ms=generation_ms,
    generated_at_pkt=datetime.now(PKT_TZ).strftime("%Y-%m-%d %H:%M:%S"),
    model=model_label,
  )
