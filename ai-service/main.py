"""Backward-compatible entry: ``uvicorn main:app`` from the ``ai-service`` directory."""

from app.main import app

__all__ = ["app"]

if __name__ == "__main__":
  import uvicorn
  uvicorn.run(
    "main:app",
    host="0.0.0.0",
    port=8001,
    reload=True,
  )
