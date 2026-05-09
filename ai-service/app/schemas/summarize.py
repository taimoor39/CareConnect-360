from typing import Optional

from pydantic import BaseModel


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
