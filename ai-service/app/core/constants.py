"""Shared configuration values for API + summarizer (single source of truth)."""

SUMMARIZATION_MODEL_ID = "facebook/bart-large-cnn"

# Summarize endpoints and summarizer pipeline
MIN_SUMMARIZE_INPUT_CHARS = 100
MAX_SUMMARIZE_INPUT_CHARS = 3000
