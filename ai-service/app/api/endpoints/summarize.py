"""POST /api/summarize (JSON) and POST /api/summarize-pdf (multipart)."""

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.constants import REPORT_TOO_BRIEF_ERROR
from app.schemas.summarize import (
  SummarizeRequest,
  SummarizeResponse,
  parse_extra_medical_terms_json,
)
from app.services.pdf_text import extract_text_from_pdf_bytes
from app.services.summarizer import summarize_report
from app.services.token_guard import validate_and_prepare_input

router = APIRouter(tags=["summarize"])


def _require_summarize_text(text: str) -> str:
  t = (text or "").strip()
  if not t:
    raise HTTPException(status_code=400, detail="Report text is empty")
  try:
    validate_and_prepare_input(t)
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc
  return t


async def _run_summarize(request: SummarizeRequest) -> SummarizeResponse:
  try:
    return await summarize_report(request)
  except ValueError as exc:
    detail = str(exc) or REPORT_TOO_BRIEF_ERROR
    status = 503 if "still loading" in detail.lower() else 400
    raise HTTPException(status_code=status, detail=detail) from exc
  except HTTPException:
    raise
  except MemoryError as exc:
    raise HTTPException(
      status_code=503,
      detail="AI model ran out of memory. Wait a moment and try again.",
    ) from exc
  except Exception as exc:
    msg = str(exc).lower()
    if "cuda" in msg or "memory" in msg or "oom" in msg:
      raise HTTPException(
        status_code=503,
        detail="AI service is under heavy load. Please try again shortly.",
      ) from exc
    raise HTTPException(status_code=500, detail=f"Summarization failed: {str(exc)}") from exc


@router.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_report_endpoint(request: SummarizeRequest):
  """
  Abstractive summarization only (SRS) — no diagnoses or treatment advice.
  Body: { "text": "...", "target_words": 200, "admin_terms": {...} }
  """
  body = request.model_copy(update={"text": _require_summarize_text(request.text)})
  return await _run_summarize(body)


@router.post("/api/summarize-pdf", response_model=SummarizeResponse)
async def summarize_pdf(
  file: UploadFile = File(...),
  target_words: int = Form(default=200),
  extra_medical_terms_json: str | None = Form(default=None),
  admin_terms_json: str | None = Form(default=None),
):
  if not file.filename or not file.filename.lower().endswith(".pdf"):
    raise HTTPException(status_code=400, detail="Only PDF files are accepted")

  try:
    contents = await file.read()
    text = extract_text_from_pdf_bytes(contents)
    if not text:
      raise HTTPException(
        status_code=422,
        detail=(
          "Could not extract text from this PDF. "
          "This appears to be a scanned/image PDF rather than a text-based PDF. "
          "Please use text entry instead."
        ),
      )

    extra = parse_extra_medical_terms_json(extra_medical_terms_json)
    admin = parse_extra_medical_terms_json(admin_terms_json)
    merged_terms = {**(extra or {}), **(admin or {})}

    req = SummarizeRequest(
      text=_require_summarize_text(text),
      target_words=target_words,
      extra_medical_terms=merged_terms or None,
    )
    return await _run_summarize(req)

  except HTTPException:
    raise
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc
  except Exception as exc:
    raise HTTPException(status_code=500, detail=f"PDF processing failed: {str(exc)}") from exc
