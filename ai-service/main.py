from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import time
import io
import re
from datetime import datetime
import pytz

app = FastAPI(title="CareConnect 360 AI Service")
PKT_TZ = pytz.timezone("Asia/Karachi")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:8000",
                 "http://localhost:5173"],
  allow_methods=["*"],
  allow_headers=["*"],
)

# ── Lazy model loading ──────────────────────────
# Model loads only on first summarization request
# Not on startup — prevents slow server boot
_summarizer = None
_summarizer_failed = False
_summarizer_error = ""

def get_summarizer():
  global _summarizer, _summarizer_failed, _summarizer_error
  if _summarizer_failed:
    return None
  if _summarizer is None:
    print("[AI] Loading BART model...")
    start = time.time()
    try:
      from transformers import pipeline
      _summarizer = pipeline(
        "summarization",
        model="facebook/bart-large-cnn",
        device=-1  # CPU (no GPU needed)
      )
      print(f"[AI] Model loaded in {time.time()-start:.1f}s")
    except Exception as e:
      _summarizer_failed = True
      _summarizer_error = str(e)
      print(f"[AI] Model unavailable, using fallback summarizer. Error: {_summarizer_error}")
  return _summarizer

def fallback_summarize(text: str, max_length: int = 150, min_length: int = 50) -> str:
  cleaned = re.sub(r'\s+', ' ', text or '').strip()
  if not cleaned:
    return ""
  parts = re.split(r'(?<=[.!?])\s+', cleaned)
  summary = ""
  for part in parts:
    if not part:
      continue
    candidate = f"{summary} {part}".strip() if summary else part
    if len(candidate) > max_length:
      break
    summary = candidate
  if len(summary) < min_length:
    summary = cleaned[:max_length].strip()
  return summary

# ── Medical term simplification dictionary ──────
MEDICAL_TERMS = {
  "hypertension":        "high blood pressure",
  "hyperlipidemia":      "high cholesterol",
  "myocardial infarction":"heart attack",
  "renal insufficiency": "kidney problems",
  "dyspnea":             "difficulty breathing",
  "tachycardia":         "fast heart rate",
  "anemia":              "low red blood cells",
  "hepatomegaly":        "enlarged liver",
  "bradycardia":         "slow heart rate",
  "hypertrophy":         "abnormal enlargement",
  "ischemia":            "reduced blood flow",
  "edema":               "swelling",
  "arrhythmia":          "irregular heartbeat",
  "atherosclerosis":     "hardening of arteries",
  "thrombosis":          "blood clot",
  "embolism":            "blocked blood vessel",
  "infarction":          "tissue death from blocked blood",
  "stenosis":            "narrowing",
  "fibrosis":            "scarring of tissue",
  "necrosis":            "tissue death",
  "sepsis":              "severe infection in bloodstream",
  "pneumonia":           "lung infection",
  "hypoglycemia":        "low blood sugar",
  "hyperglycemia":       "high blood sugar",
  "diabetes mellitus":   "diabetes",
  "osteoporosis":        "weak and brittle bones",
  "arthritis":           "joint inflammation",
  "dermatitis":          "skin inflammation",
  "gastritis":           "stomach lining inflammation",
  "hepatitis":           "liver inflammation",
  "nephritis":           "kidney inflammation",
  "appendicitis":        "appendix inflammation",
  "bronchitis":          "airway inflammation",
  "pancreatitis":        "pancreas inflammation",
  "cholesterol":         "fatty substance in blood",
  "glucose":             "blood sugar",
  "hemoglobin":          "oxygen-carrying protein in blood",
  "leukocyte":           "white blood cell",
  "erythrocyte":         "red blood cell",
  "platelet":            "blood clotting cell",
  "serum":               "liquid part of blood",
  "biopsy":              "tissue sample test",
  "catheter":            "thin tube inserted in body",
  "dialysis":            "kidney filtering treatment",
  "echocardiogram":      "heart ultrasound",
  "electrocardiogram":   "heart electrical activity test",
  "endoscopy":           "internal camera examination",
  "mammography":         "breast X-ray",
  "laparoscopy":         "keyhole surgery examination",
}

def simplify_medical_terms(text: str) -> str:
  result = text
  for medical, simple in MEDICAL_TERMS.items():
    import re
    pattern = re.compile(re.escape(medical), re.IGNORECASE)
    result  = pattern.sub(simple, result)
  return result

# ── Request/Response models ──────────────────────
class SummarizeRequest(BaseModel):
  text:       str
  max_length: Optional[int] = 150
  min_length: Optional[int] = 50

class SummarizeResponse(BaseModel):
  success:          bool
  original_length:  int
  summary:          str
  simplified:       bool
  generation_ms:    int
  generated_at_pkt: str

# ── Endpoints ────────────────────────────────────

@app.get("/api/health")
def health_check():
  return {
    "status":  "online",
    "service": "CareConnect 360 AI Service",
    "model":   "facebook/bart-large-cnn",
    "model_loaded": _summarizer is not None,
    "fallback_active": _summarizer_failed
  }

@app.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_report(request: SummarizeRequest):
  text = request.text.strip()

  if not text:
    raise HTTPException(400, "Report text is empty")

  if len(text) < 100:
    raise HTTPException(400,
      "Report too brief for meaningful summarization "
      "(minimum 100 characters)"
    )

  # Truncate if too long (BART max is ~1024 tokens)
  max_chars = 3000
  if len(text) > max_chars:
    text = text[:max_chars] + "..."

  try:
    start = time.time()
    summarizer = get_summarizer()
    if summarizer is None:
      raw_summary = fallback_summarize(
        text,
        max_length=request.max_length,
        min_length=request.min_length
      )
    else:
      result = summarizer(
        text,
        max_length=request.max_length,
        min_length=request.min_length,
        do_sample=False
      )
      raw_summary = result[0]['summary_text']
    simplified_summary = simplify_medical_terms(raw_summary)
    generation_ms     = int((time.time() - start) * 1000)
    generated_at_pkt  = datetime.now(PKT_TZ).strftime("%Y-%m-%d %H:%M:%S")

    return SummarizeResponse(
      success=True,
      original_length=len(request.text),
      summary=simplified_summary,
      simplified=True,
      generation_ms=generation_ms,
      generated_at_pkt=generated_at_pkt
    )

  except Exception as e:
    raise HTTPException(500,
      f"Summarization failed: {str(e)}"
    )

@app.post("/api/summarize-pdf")
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
      raise HTTPException(422,
        "Could not extract text from PDF. "
        "Make sure it is a text-based PDF, "
        "not a scanned image."
      )

    # Reuse text summarization
    from fastapi.testclient import TestClient
    req = SummarizeRequest(text=text)
    return await summarize_report(req)

  except HTTPException:
    raise
  except Exception as e:
    raise HTTPException(500,
      f"PDF processing failed: {str(e)}"
    )

@app.get("/api/terms")
def get_medical_terms():
  return {
    "success": True,
    "count":   len(MEDICAL_TERMS),
    "terms":   MEDICAL_TERMS
  }

if __name__ == "__main__":
  uvicorn.run(
    "main:app",
    host="0.0.0.0",
    port=8001,
    reload=True
  )
