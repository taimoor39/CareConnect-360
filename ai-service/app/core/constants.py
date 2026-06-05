"""Shared configuration values for API + summarizer (single source of truth)."""

# Default: smaller/faster CNN model (~500MB vs 1.6GB). Override with env for bart-large-cnn.
import os

SUMMARIZATION_MODEL_ID = os.environ.get(
  "SUMMARIZATION_MODEL_ID",
  "sshleifer/distilbart-cnn-12-6",
)
MODEL_LOAD_TIMEOUT_SEC = int(os.environ.get("MODEL_LOAD_TIMEOUT_SEC", "300"))
REQUEST_MODEL_WAIT_SEC = int(os.environ.get("REQUEST_MODEL_WAIT_SEC", "280"))
BART_INFERENCE_TIMEOUT_SEC = int(os.environ.get("BART_INFERENCE_TIMEOUT_SEC", "60"))

# BART-large-CNN hard context limit (tokens)
BART_MAX_INPUT_TOKENS = 1024
BART_SAFE_INPUT_TOKENS = 1020

# BART generation — tuned for 120-150 word output covering ALL clinical sections.
#
# Token ↔ word ratio for DistilBART BPE: ~1 word ≈ 1.3 tokens (medical text skews higher).
#
# max_new_tokens = 200  →  ≈ 154 words ceiling (prevents padding / repetition past target)
# min_length     = 135  →  ≈ 104 words floor   (forces multi-sentence multi-section coverage)
# length_penalty = 2.0  →  beam score divided by length^2.0 — favours longer, complete beams
#                           without the over-penalisation artefacts seen at 2.5
# num_beams      = 4    →  quality/speed sweet-spot on CPU (2× slower than greedy but
#                           measurably more coherent and complete)
# no_repeat_ngram_size=3 →  eliminates 3-gram repetition loops; keeps output clean
# early_stopping = True →  halt beam search the moment all beams have produced EOS;
#                           avoids wasted decode steps past natural stopping point
BART_MAX_NEW_TOKENS = 200
BART_MIN_LENGTH = 135
BART_NUM_BEAMS = 4
BART_NO_REPEAT_NGRAM_SIZE = 3
BART_LENGTH_PENALTY = 2.0
BART_EARLY_STOPPING = True
BART_SAFE_CHUNK_TOKENS = 1020

# Clinical input window (words) — truncate long reports; reject very short.
# 700 words ≈ 910 tokens — safely within BART's 1024-token hard limit.
MIN_INPUT_WORDS = 30
MAX_INPUT_WORDS = 700
MIN_SUMMARIZE_INPUT_CHARS = 50

# Legacy aliases used by PDF route
MIN_SUMMARIZE_WORDS = MIN_INPUT_WORDS
DEFAULT_TARGET_WORDS = 200
MIN_TARGET_WORDS = 80
MAX_TARGET_WORDS = 280

# SRS § exact client-facing error (HTTP 400)
REPORT_TOO_BRIEF_ERROR = "Report too brief for summarization"

# Disclaimer shown in patient UI (frontend) — not appended by AI service
