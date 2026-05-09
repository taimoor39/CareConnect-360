import io

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.summarize import SummarizeRequest, SummarizeResponse
from app.services.summarizer import summarize_report

router = APIRouter(tags=["summarize"])


@router.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_report_endpoint(request: SummarizeRequest):
  text = request.text.strip()

  if not text:
    raise HTTPException(400, "Report text is empty")

  if len(text) < 100:
    raise HTTPException(
      400,
      "Report too brief for meaningful summarization "
      "(minimum 100 characters)",
    )

  try:
    return await summarize_report(request)
  except Exception as e:
    raise HTTPException(500, f"Summarization failed: {str(e)}") from e


@router.post("/api/summarize-pdf")
async def summarize_pdf(file: UploadFile = File(...)):
  if not file.filename.endswith('.pdf'):
    raise HTTPException(400, "Only PDF files accepted")

  try:
    import pdfplumber
    contents = await file.read()
    text = ""
    with pdfplumber.open(io.BytesIO(contents)) as pdf:
      for page in pdf.pages:
        extracted = page.extract_text()
        if extracted:
          text += extracted + "\n"

    if not text.strip():
      raise HTTPException(
        422,
        "Could not extract text from PDF. "
        "Make sure it is a text-based PDF, "
        "not a scanned image.",
      )

    req = SummarizeRequest(text=text)
    return await summarize_report_endpoint(req)

  except HTTPException:
    raise
  except Exception as e:
    raise HTTPException(500, f"PDF processing failed: {str(e)}") from e
