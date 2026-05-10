"""PDF text extraction used by summarize PDF uploads."""

import io


def extract_text_from_pdf_bytes(data: bytes) -> str:
  import pdfplumber

  chunks = []
  with pdfplumber.open(io.BytesIO(data)) as pdf:
    for page in pdf.pages:
      extracted = page.extract_text()
      if extracted:
        chunks.append(extracted)
  return "\n".join(chunks).strip()
