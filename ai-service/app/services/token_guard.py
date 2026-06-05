"""Tokenizer-based input validation and truncation for BART-large-CNN."""

from __future__ import annotations

import logging
import re

from app.core.constants import (
  BART_SAFE_CHUNK_TOKENS,
  BART_SAFE_INPUT_TOKENS,
  MAX_INPUT_WORDS,
  MIN_INPUT_WORDS,
  MIN_SUMMARIZE_INPUT_CHARS,
  REPORT_TOO_BRIEF_ERROR,
  SUMMARIZATION_MODEL_ID,
)

logger = logging.getLogger(__name__)

_tokenizer = None
_tokenizer_failed = False


def set_shared_tokenizer(tokenizer) -> None:
  """Reuse tokenizer loaded by summarizer (avoids duplicate HF downloads)."""
  global _tokenizer, _tokenizer_failed
  if tokenizer is not None:
    _tokenizer = tokenizer
    _tokenizer_failed = False


def get_tokenizer():
  global _tokenizer, _tokenizer_failed
  if _tokenizer_failed:
    return None
  if _tokenizer is None:
    try:
      from transformers import AutoTokenizer

      _tokenizer = AutoTokenizer.from_pretrained(SUMMARIZATION_MODEL_ID)
      logger.info("Tokenizer loaded for %s", SUMMARIZATION_MODEL_ID)
    except Exception as exc:
      _tokenizer_failed = True
      logger.warning("Tokenizer unavailable: %s", exc)
  return _tokenizer


def count_tokens(text: str) -> int:
  tok = get_tokenizer()
  if tok is None:
    return max(1, int(len(text) / 4))
  return len(tok.encode(text, add_special_tokens=False))


def truncate_to_token_limit(text: str, max_tokens: int = BART_SAFE_INPUT_TOKENS) -> str:
  tok = get_tokenizer()
  if tok is None:
    max_chars = int(max_tokens * 4)
    return text[:max_chars]
  encoded = tok.encode(text, add_special_tokens=False)
  if len(encoded) <= max_tokens:
    return text
  trimmed = encoded[:max_tokens]
  return tok.decode(trimmed, skip_special_tokens=True)


def clamp_word_window(text: str, max_words: int = MAX_INPUT_WORDS) -> str:
  words = text.split()
  if len(words) <= max_words:
    return text
  logger.info("Truncating input from %s to %s words (SRS clinical window)", len(words), max_words)
  return " ".join(words[:max_words])


def validate_and_prepare_input(text: str) -> tuple[str, int, int]:
  """
  Enforce SRS guardrails: minimum content, word ceiling, token ceiling.
  Returns (prepared_text, word_count, token_count).
  """
  cleaned = " ".join((text or "").split()).strip()
  if not cleaned:
    raise ValueError(REPORT_TOO_BRIEF_ERROR)

  word_count = len(cleaned.split())
  if word_count < MIN_INPUT_WORDS and len(cleaned) < MIN_SUMMARIZE_INPUT_CHARS:
    raise ValueError(REPORT_TOO_BRIEF_ERROR)

  prepared = clamp_word_window(cleaned)
  prepared = truncate_to_token_limit(prepared)
  token_count = count_tokens(prepared)
  final_words = len(prepared.split())

  if final_words < MIN_INPUT_WORDS and len(prepared) < MIN_SUMMARIZE_INPUT_CHARS:
    raise ValueError(REPORT_TOO_BRIEF_ERROR)

  return prepared, final_words, token_count


def prepare_text_for_bart(
  text: str,
  tokenizer,
  max_safe_tokens: int = BART_SAFE_CHUNK_TOKENS,
) -> str:
  """
  Clean and truncate input for BART (1024 hard limit).
  Truncates at sentence boundary when possible.
  """
  text = re.sub(r"\n{3,}", "\n\n", text or "")
  text = re.sub(r" {2,}", " ", text).strip()
  if not text:
    return text

  if tokenizer is None:
    return truncate_to_token_limit(text, max_safe_tokens)

  tokens = tokenizer.encode(text, add_special_tokens=False)
  if len(tokens) <= max_safe_tokens:
    return text

  logger.info("Text has %s tokens, truncating to %s", len(tokens), max_safe_tokens)
  truncated_tokens = tokens[:max_safe_tokens]
  truncated_text = tokenizer.decode(truncated_tokens, skip_special_tokens=True)

  last_period = max(
    truncated_text.rfind(". "),
    truncated_text.rfind(".\n"),
    truncated_text.rfind("! "),
    truncated_text.rfind("? "),
  )
  if last_period > len(truncated_text) * 0.5:
    truncated_text = truncated_text[: last_period + 1]

  return truncated_text.strip()
