"""POST /api/summarize (JSON) and POST /api/summarize-pdf (multipart)."""
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.constants import MIN_SUMMARIZE_INPUT_CHARS, MIN_SUMMARIZE_WORDS
from app.schemas.summarize import (
  SummarizeRequest,
  SummarizeResponse,
  parse_extra_medical_terms_json,
)
from app.services.pdf_text import extract_text_from_pdf_bytes
from app.services.summarizer import summarize_report

router = APIRouter(tags=["summarize"])


def _require_summarize_text(text: str) -> str:
  t = text.strip()
  if not t:
    raise HTTPException(400, "Report text is empty")
  if len(t.split()) < MIN_SUMMARIZE_WORDS and len(t) < MIN_SUMMARIZE_INPUT_CHARS:
    raise HTTPException(
      400,
      "Report too brief for meaningful summarization. "
      f"Please provide at least {MIN_SUMMARIZE_WORDS} words of content.",
    )
  return t


async def _run_summarize(request: SummarizeRequest) -> SummarizeResponse:
  try:
    return await summarize_report(request)
  except ValueError as e:
    raise HTTPException(400, str(e)) from e
  except Exception as e:
    raise HTTPException(500, f"Summarization failed: {str(e)}") from e


@router.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_report_endpoint(request: SummarizeRequest):
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
    raise HTTPException(400, "Only PDF files are accepted")

  try:
    contents = await file.read()
    text = extract_text_from_pdf_bytes(contents)
    if not text:
      raise HTTPException(
        422,
        "Could not extract text from this PDF. "
        "This appears to be a scanned/image PDF rather than a text-based PDF. "
        "Please use text entry instead.",
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
  except Exception as e:
    raise HTTPException(500, f"PDF processing failed: {str(e)}") from e
