from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.constants import MIN_SUMMARIZE_INPUT_CHARS
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
  if len(t) < MIN_SUMMARIZE_INPUT_CHARS:
    raise HTTPException(
      400,
      "Report too brief for meaningful summarization "
      f"(minimum {MIN_SUMMARIZE_INPUT_CHARS} characters)",
    )
  return t


async def _run_summarize(request: SummarizeRequest) -> SummarizeResponse:
  try:
    return await summarize_report(request)
  except Exception as e:
    raise HTTPException(500, f"Summarization failed: {str(e)}") from e


@router.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_report_endpoint(request: SummarizeRequest):
  body = request.model_copy(update={"text": _require_summarize_text(request.text)})
  return await _run_summarize(body)


@router.post("/api/summarize-pdf", response_model=SummarizeResponse)
async def summarize_pdf(
  file: UploadFile = File(...),
  extra_medical_terms_json: str | None = Form(default=None),
):
  if not file.filename.endswith(".pdf"):
    raise HTTPException(400, "Only PDF files accepted")

  try:
    contents = await file.read()
    text = extract_text_from_pdf_bytes(contents)
    if not text:
      raise HTTPException(
        422,
        "Could not extract text from PDF. "
        "Make sure it is a text-based PDF, "
        "not a scanned image.",
      )

    extra = parse_extra_medical_terms_json(extra_medical_terms_json)
    req = SummarizeRequest(text=_require_summarize_text(text), extra_medical_terms=extra)
    return await _run_summarize(req)

  except HTTPException:
    raise
  except Exception as e:
    raise HTTPException(500, f"PDF processing failed: {str(e)}") from e
