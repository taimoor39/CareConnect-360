@echo off
echo Starting CareConnect 360 AI Service...
call venv\Scripts\activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
