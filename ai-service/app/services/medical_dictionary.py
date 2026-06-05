"""
Post-processing: simplify medical terms on BART-generated summary only (SRS §9.5).
"""

from __future__ import annotations

import re
from typing import Mapping

_MAX_SUMMARY_WORDS_VS_INPUT_RATIO = 0.92

# Collapse redundant parenthetical explanations produced when the medical dictionary
# simplifies a term that BART already copied with its own parenthetical from the source
# report, e.g.:
#   "blood clot (a blood clot)"   — article prefix variant
#   "blood clot (blood clot)"     — exact duplicate
#   "high blood pressure (high blood pressure)" — exact duplicate
_DUPLICATE_PAREN_RE = re.compile(
  r"\b([^()]{2,120}?)\s*\(\s*(?:a |an |the )?\1\s*\)",
  re.IGNORECASE,
)


def dedupe_parenthetical_phrases(text: str) -> str:
  """Remove redundant parenthetical explanations, applied repeatedly until stable."""
  prev = None
  result = text
  while prev != result:
    prev = result
    result = _DUPLICATE_PAREN_RE.sub(r"\1", result)
  return re.sub(r" {2,}", " ", result).strip()


def apply_medical_dictionary(
  text: str,
  python_terms: Mapping[str, str],
  admin_terms: Mapping[str, str] | None = None,
) -> dict:
  if not text:
    return {"simplified_text": "", "replacements_made": []}

  admin_terms = admin_terms or {}
  combined: dict[str, str] = {}

  for raw_key, raw_val in python_terms.items():
    key = str(raw_key).strip().lower()
    val = str(raw_val).strip()
    if key and val and key != val.lower():
      combined[key] = val

  for raw_key, raw_val in admin_terms.items():
    key = str(raw_key).strip().lower()
    val = str(raw_val).strip()
    if key and val:
      combined[key] = val

  sorted_terms = sorted(combined.items(), key=lambda x: len(x[0]), reverse=True)
  result = dedupe_parenthetical_phrases(text)
  replacements_made: list[dict[str, str]] = []

  for medical_term, simplified in sorted_terms:
    if not medical_term or not simplified:
      continue
    if medical_term == simplified.lower():
      continue

    pattern = re.compile(r"\b" + re.escape(medical_term) + r"\b", re.IGNORECASE)
    if not pattern.search(result):
      continue

    parenthetical = re.compile(
      r"\b" + re.escape(medical_term) + r"\s*\(\s*" + re.escape(simplified) + r"\s*\)",
      re.IGNORECASE,
    )
    if parenthetical.search(result):
      result = parenthetical.sub(simplified, result)
      replacements_made.append({"original": medical_term, "replacement": simplified})
      result = dedupe_parenthetical_phrases(result)
      continue

    reversed_paren = re.compile(
      r"\b" + re.escape(simplified) + r"\s*\(\s*" + re.escape(medical_term) + r"\s*\)",
      re.IGNORECASE,
    )
    if reversed_paren.search(result):
      result = reversed_paren.sub(simplified, result)
      result = dedupe_parenthetical_phrases(result)
      continue

    def _repl(match: re.Match[str], *, _simple: str = simplified) -> str:
      if match.group(0).lower() == _simple.lower():
        return match.group(0)
      return _simple

    new_result, count = pattern.subn(_repl, result)
    if count:
      replacements_made.append({"original": medical_term, "replacement": simplified})
      result = new_result

  result = dedupe_parenthetical_phrases(result)
  return {"simplified_text": result, "replacements_made": replacements_made}


def assert_summary_is_compressed(
  original_word_count: int,
  summary_word_count: int,
) -> None:
  if original_word_count < 40:
    return
  if summary_word_count >= original_word_count * _MAX_SUMMARY_WORDS_VS_INPUT_RATIO:
    import logging

    logging.getLogger(__name__).warning(
      "Summary length (%s words) is close to input (%s words) — verify BART ran before dictionary",
      summary_word_count,
      original_word_count,
    )
