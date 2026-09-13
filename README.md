# CareConnect 360

A clinic CRM that covers the full patient journey: registration, appointments, consultations, billing, AI report summaries, and follow-up email.

The repo is a **monorepo** with three services that run together in development.

| Service | Stack | Default URL |
|---|---|---|
| Frontend | React 19 + Vite | [http://localhost:5173](http://localhost:5173) |
| Backend API | Node.js + Express + MongoDB | [http://localhost:8000](http://localhost:8000) |
| AI service | Python FastAPI + DistilBART | [http://localhost:8001](http://localhost:8001) |

Times and appointment dates use **Pakistan Standard Time** (`Asia/Karachi`).

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Environment](#environment)
- [Run](#run)
- [Default admin](#default-admin)
- [Portals](#portals)
- [API](#api)
- [Scheduled emails](#scheduled-emails)
- [Production](#production)
- [Troubleshooting](#troubleshooting)

---

## Features

**Clinic operations**

- Roles: Admin, Doctor, Receptionist, Patient
- Patient records, doctor schedules, appointment workflow, QR check-in
- Consultations, prescriptions, medical report upload (PDF or text)
- Invoices, payments, PDF export
- User management, portal access approval, audit log, analytics

**AI summaries**

- DistilBART (`sshleifer/distilbart-cnn-12-6`) on CPU
- Doctor review: generate, edit, approve, or reject
- Patients only see summaries after approval

**Engagement**

- Appointment reminder, missed appointment, prescription renewal, re-engagement, AI summary ready
- Editable HTML templates and SMTP from **Settings → Email**
- Test send to any address per template or connection check
- Cron schedules in **Settings → Scheduled Jobs** (PKT)

---

## Tech stack

### Frontend (`frontend/`)

| Tool | Role |
|---|---|
| React 19 | UI |
| Vite 6 | Dev server and production build |
| React Router 7 | Routing |
| Tailwind CSS 3 | Styling |
| Axios | HTTP |
| Socket.IO client | Admin live refresh |
| Recharts | Analytics charts |
| jsPDF | Client PDFs |
| html5-qrcode | QR scan |
| dayjs | Dates |
| react-toastify | Toasts |

### Backend (`backend/`)

| Tool | Role |
|---|---|
| Node.js 18+ / Express 4 | REST API |
| MongoDB + Mongoose 8 | Data |
| JWT + bcrypt | Auth |
| Socket.IO | Admin realtime |
| Nodemailer | Email |
| node-cron | Scheduled jobs |
| Multer | Uploads |
| PDFKit | Invoice PDFs |
| qrcode / jsQR / Jimp | QR generate and image check-in |
| Helmet, CORS, express-rate-limit | Security |
| express-validator | Input validation |
| Swagger UI | API docs at `/api/docs` |

### AI service (`ai-service/`)

| Tool | Role |
|---|---|
| Python 3.10–3.14 | Runtime |
| FastAPI + Uvicorn | HTTP |
| PyTorch + Transformers | DistilBART summarization |
| pdfplumber | PDF text extraction |
| Pydantic | Request/response models |

### Repo tooling

| Tool | Role |
|---|---|
| npm workspaces | `frontend` and `backend` |
| concurrently | One-command `npm run dev` |

---

## Architecture

```
CareConnect-360/
├── frontend/                 React SPA (Vite)
├── backend/                  Express API + Socket.IO + cron
│   ├── src/
│   │   ├── controllers/
│   │   ├── jobs/             Engagement cron (PKT)
│   │   ├── models/
│   │   ├── routes/
│   │   ├── seeders/          Default admin
│   │   └── server.js
│   └── scripts/seed-admin.js
├── ai-service/               FastAPI + BART
│   ├── app/
│   ├── requirements.txt
│   └── launch.py
├── scripts/dev-ai.mjs        Creates venv and starts AI
└── package.json              Root scripts
```

Typical request path:

```
Browser (5173)
    → Express /api (8000) + MongoDB
    → FastAPI /api/summarize (8001) when a doctor generates a summary
```

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18 LTS or newer | Backend and frontend |
| npm | 9+ | Bundled with Node |
| MongoDB | 6+ | Local or Atlas |
| Python | 3.10–3.14 | AI service |
| Git | 2+ | Clone |

On Windows PowerShell, allow venv activation if needed:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

---

## Setup

### 1. Clone

```bash
git clone <repository-url>
cd CareConnect-360
```

### 2. Install Node packages

From the **project root**:

```bash
npm install
```

This installs the root, `frontend`, and `backend` workspaces.

### 3. Python environment (AI)

`npm run dev` can create `ai-service/venv` and install requirements via `scripts/dev-ai.mjs`. To do it yourself:

```bash
cd ai-service
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
cd ..
```

The first AI start downloads **sshleifer/distilbart-cnn-12-6** (~500 MB) into the Hugging Face cache. Later starts reuse the cache.

### 4. Environment files

Copy the examples and adjust as needed:

```bash
# Windows PowerShell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
Copy-Item ai-service\.env.example ai-service\.env
```

```bash
# macOS / Linux
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp ai-service/.env.example ai-service/.env
```

Set a real `JWT_SECRET` in `backend/.env` before anything beyond local demos.

### 5. Start MongoDB

Local example:

```bash
# URI expected by backend/.env.example
mongodb://127.0.0.1:27017/mern-stack-project
```

Atlas works if you put that URI in `MONGODB_URI` and allow your IP.

---

## Environment

### Backend — `backend/.env`

| Variable | Purpose | Example |
|---|---|---|
| `PORT` | API port | `8000` |
| `TZ` | Process timezone | `Asia/Karachi` |
| `MONGODB_URI` | Mongo connection | `mongodb://127.0.0.1:27017/mern-stack-project` |
| `JWT_SECRET` | Token signing key | long random string |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `FRONTEND_URL` | Links in emails / CORS | `http://localhost:5173` |
| `AI_SERVICE_URL` | Summarizer base URL | `http://localhost:8001` |
| `ENFORCE_EMAIL_VERIFICATION` | Block login until verified | `false` for local |

SMTP is **not** in `.env`. Configure it in **Admin → Settings → Email** after login.

### Frontend — `frontend/.env`

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend API, e.g. `http://localhost:8000/api` |
| `VITE_APP_NAME` | Display name |

Vite only exposes variables prefixed with `VITE_`. Rebuild the frontend if you change them in production.

### AI service — `ai-service/.env` (optional)

| Variable | Default |
|---|---|
| `SUMMARIZATION_MODEL_ID` | `sshleifer/distilbart-cnn-12-6` |
| `MODEL_LOAD_TIMEOUT_SEC` | `300` |
| `REQUEST_MODEL_WAIT_SEC` | `280` |
| `BART_INFERENCE_TIMEOUT_SEC` | `60` |

---

## Run

### All services (recommended)

From the **project root**, with MongoDB running:

```bash
npm run dev
```

This:

1. Seeds the default admin **if no admin exists**
2. Starts backend (`8000`), frontend (`5173`), and AI (`8001`)

Open [http://localhost:5173](http://localhost:5173).

Swagger: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

### One service at a time

```bash
npm run seed:admin      # idempotent; skip if an admin already exists
npm run dev:backend
npm run dev:frontend
npm run dev:ai
npm run dev:ai:reload   # AI with uvicorn --reload
```

### What you should see

1. Backend: `MongoDB connected`, `Server is running on port 8000`, cron jobs scheduled
2. Frontend: Vite ready on `5173`
3. AI: FastAPI on `8001`; model loads in the background (about 30–120 seconds)

---

## Default admin

Stored in `backend/src/seeders/admin.defaults.json`.

| Field | Value |
|---|---|
| Email | `admin@example.com` |
| Password | `abc123456` |

Change this password after first login. Seed runs automatically on `npm run dev` and can be run with `npm run seed:admin`.

---

## Portals

| Role | After login |
|---|---|
| Admin | `/dashboard` — patients, doctors, appointments, billing, users, analytics, audit, settings |
| Doctor | `/doctor/dashboard` — schedule, consultations, prescriptions, report summaries |
| Receptionist | `/receptionist/dashboard` — patients, appointments, QR check-in, billing |
| Patient | `/patient/dashboard` — own appointments, prescriptions, approved reports, invoices |

Public routes: `/login`, `/register`, `/forgot-password`, `/reset-password/:token`, `/verify-email/:token`.

---

## API

### Backend (`:8000`)

| Prefix | Area |
|---|---|
| `/api/auth` | Login, register, password reset, email verify |
| `/api/users` | Admin user CRUD, temp passwords |
| `/api/patients` | Clinical patient records |
| `/api/doctors` | Doctor directory (admin) |
| `/api/appointments` | Booking, status, QR check-in |
| `/api/billing` | Invoices and PDFs |
| `/api/doctor` | Doctor portal |
| `/api/patient` | Patient portal |
| `/api/receptionist` | Receptionist workflows |
| `/api/portal-access` | Portal approve / reject |
| `/api/dashboard` | KPIs |
| `/api/analytics` | Charts |
| `/api/engagement` | Logs, stats, template test sends |
| `/api/settings` | SMTP, cron, clinic, AI URL, terms |
| `/api/audit` | Audit trail |
| `/api/docs` | Swagger UI |
| `/health` | Process health |

### AI service (`:8001`)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Model load status |
| `POST` | `/api/summarize` | Summarize text |
| `POST` | `/api/summarize-pdf` | Summarize uploaded PDF |
| `GET` | `/api/terms` | Built-in medical term list |

---

## Scheduled emails

Jobs run in **Asia/Karachi**. SMTP and templates live in **Settings → Email**. Use **Send test email** on a template or job to deliver a `[TEST]` sample to any address.

| Rule | When | Default |
|---|---|---|
| Appointment reminder | Scheduled visits about 24 hours ahead | Daily 09:00 |
| Missed appointment | Unattended slots marked missed, then emailed | Daily 23:59 |
| Prescription renewal | Follow-up about 7 days out | Daily 08:00 |
| Re-engagement | No completed visit in 6+ months | Daily 10:00 |
| AI summary ready | On doctor approve, plus hourly catch-up | Event + hourly |

**Run Now** on Scheduled Jobs executes the real job (live patients), not the test-template send.

---

## Production

**Backend**

```bash
set NODE_ENV=production
npm start --workspace backend
```

- Strong unique `JWT_SECRET`
- Secured `MONGODB_URI`
- `FRONTEND_URL` set to the real SPA origin
- HTTPS and a reverse proxy; allow WebSocket upgrades on `/socket.io`

**Frontend**

```bash
npm run build --workspace frontend
```

Serve `frontend/dist`. Set `VITE_API_URL` **at build time**.

**AI**

```bash
cd ai-service
source venv/bin/activate   # or venv\Scripts\activate on Windows
python launch.py
```

Keep a **single** Uvicorn worker; the model is loaded in one process.

---

## Troubleshooting

**MongoDB connection refused**  
Start MongoDB and confirm `MONGODB_URI` in `backend/.env`.

**Login fails for the seeded admin**  
Run `npm run seed:admin` against the same database. Default login is `admin@example.com` / `abc123456`.

**Test email / cron mail not sending**  
In **Settings → Email**, set SMTP host, user, password, and **From email**, then use **Test Email Connection** with a recipient you control.

**AI service unavailable**  
Wait until `GET http://localhost:8001/api/health` shows the model loaded. First download is large. `npm run dev:ai` frees port `8001` before bind.

**Port already in use (Windows)**  
Backend clears `8000` via `scripts/free-port.js`. For `8001`, stop the old Python process or rerun `npm run dev:ai`.

**Email verification blocks login**  
Leave `ENFORCE_EMAIL_VERIFICATION` unset or `false` locally, or configure SMTP so verification mail can send.

---

## License

Private — all rights reserved. Do not copy, distribute, or use this code without permission from the project owner.
