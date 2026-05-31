"""Sentence-boundary text chunking for BART (1024 token context limit)."""
import logging
import re

logger = logging.getLogger(__name__)

CHARS_PER_TOKEN = 1.3


def split_into_chunks(text: str, max_tokens: int = 900) -> list[str]:
  """
  Split text into chunks BART can process (~900 tokens ≈ 1170 chars).
  Splits on sentence boundaries to avoid cutting mid-sentence.
  """
  max_chars = int(max_tokens * CHARS_PER_TOKEN)
  cleaned = (text or "").strip()
  if not cleaned:
    return []
  if len(cleaned) <= max_chars:
    return [cleaned]

  sentences = re.split(r"(?<=[.!?])\s+|(?<=\n)\s*", cleaned)
  sentences = [s.strip() for s in sentences if s.strip()]

  chunks: list[str] = []
  current = ""

  for sentence in sentences:
    if len(current) + len(sentence) + 1 > max_chars:
      if current:
        chunks.append(current.strip())
        current = sentence
      else:
        words = sentence.split()
        temp = ""
        for word in words:
          if len(temp) + len(word) + 1 > max_chars:
            if temp:
              chunks.append(temp.strip())
            temp = word
          else:
            temp = f"{temp} {word}".strip() if temp else word
        if temp:
          current = temp
    else:
      current = f"{current} {sentence}".strip() if current else sentence

  if current:
    chunks.append(current.strip())

  return [c for c in chunks if len(c) > 20]
