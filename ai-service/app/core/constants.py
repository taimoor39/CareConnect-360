"""Shared configuration values for API + summarizer (single source of truth)."""

SUMMARIZATION_MODEL_ID = "facebook/bart-large-cnn"

# Summarize endpoints — word-based limits (SRS FR35: 150–250 words)
MIN_SUMMARIZE_WORDS = 15
MIN_SUMMARIZE_INPUT_CHARS = 50
DEFAULT_TARGET_WORDS = 200
MIN_TARGET_WORDS = 80
MAX_TARGET_WORDS = 280
