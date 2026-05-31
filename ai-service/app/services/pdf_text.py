"""PDF text extraction for summarize PDF uploads."""
import io
import logging
import re

logger = logging.getLogger(__name__)


def extract_text_from_pdf_bytes(data: bytes) -> str:
  import pdfplumber

  chunks: list[str] = []
  with pdfplumber.open(io.BytesIO(data)) as pdf:
    page_count = len(pdf.pages)
    logger.info("PDF has %s pages", page_count)
    for page_num, page in enumerate(pdf.pages):
      extracted = page.extract_text()
      if extracted:
        chunks.append(extracted)
      else:
        logger.warning("Page %s: no text extracted (may be scanned image)", page_num + 1)

  text = "\n".join(chunks).strip()
  if not text:
    return ""

  text = re.sub(r"\n{3,}", "\n\n", text)
  text = re.sub(r" {2,}", " ", text)
  return text
