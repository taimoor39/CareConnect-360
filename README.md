# CareConnect 360

> **A full-stack Healthcare CRM & Clinical Automation Platform** built for modern clinics — multi-role dashboards, appointment scheduling, AI-powered medical report summarization, automated patient engagement, billing, and a patient self-service portal.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Prerequisites](#prerequisites)
6. [Installation](#installation)
7. [Environment Configuration](#environment-configuration)
8. [AI Service Setup](#ai-service-setup)
9. [Database Seeding](#database-seeding)
10. [Running the Application](#running-the-application)
11. [Role-Based Portals](#role-based-portals)
12. [API Reference](#api-reference)
13. [Patient Engagement Engine](#patient-engagement-engine)
14. [Real-Time Updates](#real-time-updates)
15. [Security](#security)
16. [Production Deployment](#production-deployment)
17. [Troubleshooting](#troubleshooting)
18. [License](#license)

---

## Overview

CareConnect 360 is a clinic management system designed to digitise and automate every touchpoint of a patient's journey — from registration and appointment booking to consultation, billing, and follow-up communication.

The platform runs as a **monorepo** with three cooperating services:

| Service | Description | Default Port |
|---|---|---|
| **Backend** | Node.js / Express REST API + Socket.IO | `8000` |
| **Frontend** | React 19 SPA (Vite) | `5173` |
| **AI Service** | Python FastAPI — DistilBART report summarization | `8001` |

---

## Key Features

### Clinical Operations
- Multi-role authentication (Admin, Doctor, Receptionist, Patient)
- Patient registration, search, archival, and patient-code generation
- Doctor profiles with schedule management and specializations
- Appointment scheduling with full status workflow and QR code check-in
- Consultation records with notes, diagnosis, symptoms, and follow-up dates
- Prescription management with multi-item medicines, dosage, frequency, and duration
- Medical report upload (PDF or text) with AI-powered summarization pipeline
- Doctor approval workflow before summaries are visible to patients

### AI Summarization Pipeline
- DistilBART (CNN/12-6) model — ~500 MB, runs fully on CPU
- Pre-processing: disclaimer stripping, section-header removal, parenthetical translation stripping
- Post-processing: medical dictionary simplification (80+ terms), noise cleanup
- Target output: 120–150 word patient-friendly summaries covering all clinical sections
- Configurable from Admin → Settings → AI Service (URL, timeout, toggle)

### Administration
- Clinic-wide analytics dashboard with Recharts visualizations
- Billing and invoicing with PDF generation and payment tracking
- User management (create, edit roles, reset passwords, temporary credentials)
- Patient portal access requests with approve/reject/reopen workflow
- Filterable, paginated audit log with IP and user-agent tracking
- System settings: SMTP, security policy, cron schedules, AI service, medical terms dictionary, email templates

### Patient Engagement Engine
- 5 automated engagement rules via node-cron (PKT timezone)
- Admin-editable HTML email templates with `{variable}` substitution
- Duplicate-send prevention per rule per patient per day/week
- Full `EngagementLog` audit trail

### Patient Portal
- Self-registration with admin-approval workflow
- View appointments, prescriptions, approved AI report summaries
- Invoice download
- Profile management

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React | 19.x |
| Build tool | Vite | 6.x |
| Styling | Tailwind CSS | 3.x |
| Charts | Recharts | 3.x |
| Routing | React Router | 7.x |
| HTTP client | Axios | 1.x |
| PDF client-side | jsPDF + jsPDF-AutoTable | 4.x / 5.x |
| QR scanner | html5-qrcode | 2.x |
| Backend runtime | Node.js | 18+ |
| Web framework | Express | 4.x |
| Database ODM | Mongoose (MongoDB) | 8.x |
| Authentication | JWT + bcrypt | jsonwebtoken 9.x |
| Real-time | Socket.IO | 4.x |
| Email | Nodemailer | 8.x |
| Scheduling | node-cron | 4.x |
| File upload | Multer (in-memory) | 2.x |
| PDF server-side | PDFKit | 0.18.x |
| QR generation | qrcode + jsQR | 1.x |
| API docs | Swagger UI Express | 5.x |
| AI runtime | Python + FastAPI + Uvicorn | 3.10+ / 0.104 / 0.24 |
| Summarization model | sshleifer/distilbart-cnn-12-6 | via HuggingFace |
| PyTorch | torch | 2.9+ |
| PDF extraction | pdfplumber | 0.10.x |

---

## Architecture

```
CareConnect360/
│
├── backend/                          Node.js / Express API (ES modules)
│   ├── src/
│   │   ├── config/                   MongoDB connection
│   │   ├── controllers/              Route handlers (19 controllers)
│   │   │   ├── authController.js
│   │   │   ├── patientController.js
│   │   │   ├── doctorPortalController.js
│   │   │   ├── appointmentController.js
│   │   │   ├── billingController.js
│   │   │   ├── analyticsController.js
│   │   │   ├── dashboardController.js
│   │   │   ├── settingsController.js
│   │   │   └── ...
│   │   ├── jobs/                     Cron job definitions (engagement rules)
│   │   ├── middleware/               Auth, validation, Helmet, CORS, rate limiting
│   │   ├── models/                   Mongoose schemas (16 models)
│   │   ├── realtime/                 Socket.IO admin channel
│   │   ├── routes/                   Express routers (19 route modules)
│   │   ├── seeders/                  Default admin bootstrap
│   │   ├── utils/                    Shared helpers (audit, email, dates, PDF, JWT)
│   │   ├── validators/               express-validator rule sets
│   │   └── server.js                 App entry — HTTP + Socket.IO
│   ├── scripts/
│   │   ├── free-port.js              Kills process on a given port before start
│   │   └── seed-admin.js             Admin seeder runner
│   └── package.json
│
├── frontend/                         React SPA
│   ├── src/
│   │   ├── api/                      Axios API client modules (per-domain)
│   │   ├── components/               Reusable UI components
│   │   │   ├── dashboard/
│   │   │   ├── billing/
│   │   │   ├── doctor/
│   │   │   ├── patients/
│   │   │   ├── audit/
│   │   │   └── settings/
│   │   ├── features/                 Self-contained feature slices (patient portal)
│   │   ├── hooks/                    Custom React hooks
│   │   ├── pages/                    Route-level page components (33 pages)
│   │   ├── shared/                   Layouts, common modals, auth components
│   │   └── utils/                    Date helpers, formatters, auth utilities
│   └── package.json
│
├── ai-service/                       Python FastAPI microservice
│   ├── app/
│   │   ├── api/endpoints/            /api/summarize, /api/summarize-pdf, /api/health, /api/terms
│   │   ├── core/                     constants.py (BART params), config.py (CORS)
│   │   ├── schemas/                  Pydantic request/response models
│   │   └── services/
│   │       ├── summarizer.py         BART model load, inference, pre/post processing
│   │       ├── medical_terms.py      80+ term simplification dictionary
│   │       ├── medical_dictionary.py Term application with parenthetical deduplication
│   │       ├── token_guard.py        Input validation and token-level truncation
│   │       └── pdf_text.py           pdfplumber extraction
│   ├── launch.py                     Windows-safe launcher (frees port 8001 before start)
│   ├── requirements.txt
│   └── start.bat
│
├── scripts/
│   └── health-check.mjs              Checks all three services are reachable
│
└── package.json                      Monorepo root — npm workspaces + concurrently scripts
```

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Minimum Version | Notes |
|---|---|---|
| **Node.js** | 18.x LTS | Required for backend + frontend |
| **npm** | 9.x | Comes with Node.js |
| **MongoDB** | 6.x | Local instance or MongoDB Atlas |
| **Python** | 3.10 | Required for AI service |
| **pip** | 23+ | Python package manager |
| **Git** | 2.x | To clone the repository |

> **Windows note:** PowerShell execution policy must allow scripts for the Python venv activation. Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` if needed.

---

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd CareConnect360
```

### 2. Install Node.js dependencies

```bash
npm install
```

This installs dependencies for the **root**, **backend**, and **frontend** workspaces in a single command.

### 3. Set up the Python virtual environment (AI Service)

```bash
cd ai-service
python -m venv venv
```

**Activate the virtual environment:**

```bash
# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# Windows (CMD)
venv\Scripts\activate.bat

# macOS / Linux
source venv/bin/activate
```

**Install Python dependencies:**

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> **First startup note:** The AI service will automatically download the `sshleifer/distilbart-cnn-12-6` model (~500 MB) from Hugging Face on first run. This is cached to `~/.cache/huggingface/` and not re-downloaded on subsequent starts.

```bash
cd ..   # Return to project root
```

---

## Environment Configuration

### Backend — `backend/.env`

Create the file `backend/.env` (not committed to version control):

```env
# ── Server ──────────────────────────────────────────────────
PORT=8000

# ── Database ─────────────────────────────────────────────────
MONGODB_URI=mongodb://127.0.0.1:27017/careconnect360

# ── Authentication ───────────────────────────────────────────
# Generate a strong secret: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=replace-with-a-long-random-secret-at-least-64-characters
JWT_EXPIRES_IN=7d

# ── Frontend URL (used in email links) ───────────────────────
FRONTEND_URL=http://localhost:5173

# ── Optional ─────────────────────────────────────────────────
# MongoDB ObjectId of a virtual "System" user for audit log entries
SYSTEM_USER_ID=

# When true, non-admin accounts cannot log in until email is verified
# Leave unset or false during local development
ENFORCE_EMAIL_VERIFICATION=false

# AI service base URL (default used if not set in DB settings)
AI_SERVICE_URL=http://localhost:8001
```

### Frontend — `frontend/.env` or `frontend/.env.local`

```env
VITE_API_URL=http://localhost:8000/api
```

### AI Service — `ai-service/.env` *(optional)*

The AI service works with zero environment variables. These are only needed to override defaults:

```env
# Override default model (larger, better quality, ~1.6 GB, much slower on CPU)
SUMMARIZATION_MODEL_ID=facebook/bart-large-cnn

# Timeout constants (seconds) — also configurable from Admin Settings in the UI
MODEL_LOAD_TIMEOUT_SEC=300
REQUEST_MODEL_WAIT_SEC=280
BART_INFERENCE_TIMEOUT_SEC=60
```

> **SMTP is not configured via `.env`.** Email settings (host, port, user, password, from-address) are saved to the database via **Admin → Settings → Email** and cached in memory. This allows runtime changes without restarting the server.

---

## AI Service Setup

The AI summarization service runs as an independent FastAPI microservice.

### How it works

1. On startup the BART model loads in a background thread — the HTTP server is ready immediately.
2. Incoming `/api/summarize` requests wait (up to 280 s) for the model to finish loading.
3. Input is preprocessed: disclaimers stripped → section headers removed → parenthetical translations removed → token truncation applied.
4. DistilBART generates a 120–150 word abstractive summary (4-beam search, CPU inference).
5. Output is post-processed: 80+ medical term simplifications applied → noise cleanup → punctuation fix.
6. If BART exceeds the 60 s timeout, an extractive fallback (leading sentences) is returned.

### Configuration via Admin UI

Once the application is running, configure AI settings at **Admin → Settings → AI Service**:

| Field | Description | Default |
|---|---|---|
| AI Service URL | Base URL of the FastAPI service | `http://localhost:8001` |
| Request Timeout (s) | Max wait for a summarize response | `180` |
| Max Report Length | Input character cap | `50000` |
| AI Summarization Enabled | Global on/off toggle | `true` |
| Auto-summarize on Upload | Trigger AI immediately on report upload | `false` |

After saving, click **Check Connection** to verify the AI service is reachable.

### API endpoints (AI Service)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Service health + model status |
| `POST` | `/api/summarize` | Summarize plain text report (JSON body) |
| `POST` | `/api/summarize-pdf` | Summarize PDF upload (multipart form) |
| `GET` | `/api/terms` | List the built-in medical simplification dictionary |

### Overriding the BART model

To use the larger (and slower) `facebook/bart-large-cnn` model instead of the default:

```env
# In ai-service/.env
SUMMARIZATION_MODEL_ID=facebook/bart-large-cnn
```

Model comparison:

| Model | Size | CPU Inference | Quality |
|---|---|---|---|
| `sshleifer/distilbart-cnn-12-6` *(default)* | ~500 MB | ~20–30 s | Good |
| `facebook/bart-large-cnn` | ~1.6 GB | ~60–90 s | Better |

---

## Database Seeding

### Default Admin Account

Default credentials are stored in `backend/src/seeders/admin.defaults.json`.

| Field | Value |
|---|---|
| Email | `admin@example.com` |
| Password | `abc123456` |

> **Change the default password immediately after first login.**

### Seed the admin user

Run once before starting the application for the first time:

```bash
npm run seed:admin --workspace backend
```

This command is **idempotent** — it creates the admin user if it doesn't exist, and skips silently if it does. The password hash is also verified and corrected if stale.

**Alternative:** When logged in as admin, `POST /api/seeders/run` triggers the same seed via the API.

---

## Running the Application

### Development (all three services together)

```bash
npm run dev
```

This uses `concurrently` to start backend (port 8000), frontend (port 5173), and AI service (port 8001) in parallel with colour-coded output.

### Individual services

```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend

# AI service only
npm run dev:ai

# AI service with hot-reload (development only — slower startup)
npm run dev:ai:reload
```

### Health check (all services)

```bash
npm run health
```

Verifies that all three services are reachable and reports their status.

### Expected startup sequence

1. **Backend** starts on `:8000` — MongoDB connection logged.
2. **Frontend** starts on `:5173` — Vite dev server ready.
3. **AI Service** starts on `:8001` — FastAPI binds immediately; BART model loads in background (~30–120 s depending on hardware). Requests made before the model is ready will wait in a queue.

---

## Role-Based Portals

### Admin

The admin role has full platform access.

| Module | Capabilities |
|---|---|
| **Dashboard** | Clinic-wide KPIs (patients, appointments, revenue, pending summaries), analytics charts, real-time push refresh via Socket.IO |
| **Patients** | Full CRUD, search by name/phone/code, archive, patient-code generation, view medical history |
| **Doctors** | Create/edit profiles, schedules, specializations, active status toggle |
| **Appointments** | Schedule, view, edit, status transitions (Scheduled → Checked-In → In-Progress → Completed/Missed/Cancelled), QR check-in |
| **Billing** | Create/edit invoices, line items, tax, payment tracking, PDF export |
| **Users** | Create accounts for all roles, password reset, temporary passwords, role change |
| **Portal Access** | Approve/reject/reopen patient portal requests; badge counters on sidebar |
| **Audit Log** | Filterable, paginated system activity trail with IP + user-agent |
| **Analytics** | Patient registration trends, appointment stats, revenue charts |
| **Settings** | SMTP config, security policy, cron schedules, clinic info, AI service, medical terms dictionary, email templates |

### Doctor

| Module | Capabilities |
|---|---|
| **Dashboard** | Today/week schedule, pending AI summary approvals |
| **My Patients** | List of patients linked via appointments; open consultation history drawer |
| **Consultations** | Create and edit with symptoms, diagnosis, notes, follow-up dates, draft/complete modes |
| **Prescriptions** | Multi-item prescriptions with medicine name, dosage, frequency, duration, instructions |
| **Reports** | Upload PDF or text medical reports; Generate / Regenerate AI summaries; Approve or reject summaries; Edit approved text; Replace or delete uploaded reports |
| **Schedule** | Personal appointment schedule |

### Receptionist

| Module | Capabilities |
|---|---|
| **Dashboard** | Daily appointment overview |
| **Patients** | Register new patients, search existing records |
| **Appointments** | Schedule appointments, update statuses, QR check-in (camera or image upload) |
| **Billing** | Create invoices, record payments |

### Patient

| Module | Capabilities |
|---|---|
| **Dashboard** | Upcoming appointments overview |
| **Appointments** | View personal appointment history and status |
| **Prescriptions** | View prescriptions issued by doctors |
| **Reports** | View approved AI-generated summaries (in plain language) |
| **Invoices** | View and download billing invoices |
| **Profile** | Update personal information; portal access subject to admin approval |

---

## API Reference

### Backend REST API (`:8000`)

| Prefix | Purpose |
|---|---|
| `POST /api/auth/login` | Login (all roles) |
| `POST /api/auth/register` | Patient self-registration |
| `GET/POST /api/auth/verify-email/:token` | Email address verification |
| `POST /api/auth/forgot-password` | Password reset link |
| `POST /api/auth/reset-password/:token` | Confirm password reset |
| `/api/users` | User CRUD, status toggle, role change, password reset |
| `/api/patients` | Patient CRUD, search, stats, archive |
| `/api/doctors` | Doctor listing, profile reads |
| `/api/appointments` | Scheduling, status transitions, QR check-in |
| `/api/billing` | Invoice CRUD, PDF generation, payment recording |
| `/api/doctor` | Doctor portal — consultations, prescriptions, reports, AI summaries |
| `/api/patient` | Patient portal — appointments, prescriptions, reports, invoices |
| `/api/receptionist` | Receptionist workflows |
| `/api/portal-access` | Portal access requests, admin approval/rejection |
| `/api/dashboard` | Role-aware KPI stats |
| `/api/analytics` | Chart data and trends |
| `/api/engagement` | Engagement logs, stats, manual test sends |
| `/api/settings` | System configuration (all categories) |
| `/api/audit` | Audit log queries |
| `/api/admin` | Admin-specific bulk operations |
| `/api/staff` | Staff management |
| `/api/menus` | Dynamic sidebar menu config |
| `/api/seeders` | DB seeding (admin only) |
| `GET /api/openapi.json` | OpenAPI specification |
| `GET /api/docs` | Swagger UI interactive documentation |

### AI Service REST API (`:8001`)

| Method | Path | Body / Form | Response |
|---|---|---|---|
| `GET` | `/api/health` | — | `{ status, model_loaded, model_loading, model_id }` |
| `POST` | `/api/summarize` | `{ text, target_words?, admin_terms? }` | `{ summary, summary_words, replacements_made, generation_ms, model }` |
| `POST` | `/api/summarize-pdf` | `file` (PDF), `target_words?`, `admin_terms_json?` | Same as above |
| `GET` | `/api/terms` | — | Built-in medical→simplified dictionary |

---

## Patient Engagement Engine

Five automated rules send personalised emails to patients on clinic-configurable schedules.

| Rule | Trigger | Default Schedule | Dedup |
|---|---|---|---|
| **ER-1** | Appointment within next 24 hours | Daily 9:00 AM PKT | Daily per patient |
| **ER-2** | Appointment marked Missed | Daily 11:58 PM PKT | Daily per patient |
| **ER-3** | Prescription follow-up within 7 days | Daily 8:00 AM PKT | Daily per patient |
| **ER-4** | Patient inactive > 6 months | Daily 10:00 AM PKT | Weekly per patient |
| **ER-5** | Doctor approves an AI summary | Immediate (fire-and-forget) | Daily per patient |

### Key behaviours

- **Duplicate prevention:** Each rule + patient pair logs to `EngagementLog`; the job skips patients that already received the rule's email in the current window (daily for ER-1/2/3/5; weekly for ER-4).
- **Dynamic cron schedules:** Cron expressions are stored in `SystemSettings` and can be updated from Admin → Settings → Scheduling without restarting the server.
- **Error isolation:** Failures for one patient do not halt the loop; each send is wrapped in individual try/catch.
- **SMTP caching:** Settings are cached with a 5-minute TTL; the cache is invalidated immediately when SMTP settings are saved.
- **Admin testing:** `POST /api/engagement/test/:ruleId` triggers a test email for a specified patient without writing to `EngagementLog`.

---

## Real-Time Updates

Connected admin browsers receive live push hints via Socket.IO without polling.

### How it works

1. The Socket.IO server is mounted on **the same HTTP server** as the Express API (`/socket.io` path).
2. On connection the client presents a JWT in `socket.handshake.auth.token` (or `query.token`).
3. The server verifies the token, checks the user is an active admin, and validates the `tv` (token-version) claim.
4. Authenticated admins join the `admins` room.
5. After relevant mutations (dashboard stats, billing totals, portal-access badge counts) the server emits `admin:refresh` to the `admins` room.

### Event shape

```json
{
  "ts": "2026-06-05T10:00:00.000Z",
  "scopes": ["dashboard", "portalBadge", "billing"],
  "reason": "consultation_completed"
}
```

`scopes` is an array of affected data areas. An empty `scopes` array is treated as a full-refresh hint. The frontend refreshes only the relevant data slices.

> **Infrastructure note:** Reverse proxies (nginx, Caddy) and CDNs must allow WebSocket upgrades on the `/socket.io` path. If you scale the backend horizontally, sticky sessions are required to ensure Socket.IO clients reconnect to the same server instance.

---

## Security

| Measure | Details |
|---|---|
| **Security headers** | Helmet on every response (CSP, HSTS, X-Frame-Options, etc.) |
| **Rate limiting** | Global configurable per-IP limit; patient portal has an additional stricter limit (100 req / 15 min) |
| **Authentication** | JWT access tokens with configurable expiry; optional `tv` claim for instant token invalidation |
| **Password hashing** | bcrypt with auto-generated salt rounds |
| **Password policy** | Minimum length, uppercase, and numeric requirements (configurable in Settings) |
| **CORS** | Whitelist-only; configured per environment |
| **Input validation** | express-validator on all endpoints; Pydantic models on the AI service |
| **File upload** | Multer in-memory storage; PDF MIME-type and size (10 MB max) enforced on upload and re-validate at save |
| **Audit logging** | Every significant mutation is logged with action, target, userId, IP, and user-agent |
| **SMTP secrets** | Admin password is stored hashed and never returned to the frontend (masked on read) |
| **Socket.IO** | Connections rejected unless JWT verifies an active admin with matching token version |

---

## Production Deployment

### Backend

```bash
# Build is not required for Node.js — just run without nodemon
npm start --workspace backend
```

Set `NODE_ENV=production` in your environment. Key production checklist:

- [ ] Use a strong, unique `JWT_SECRET` (64+ character random hex)
- [ ] Point `MONGODB_URI` to a secured Atlas cluster or hardened local instance
- [ ] Set `FRONTEND_URL` to your actual deployed SPA origin (used in email links and CORS)
- [ ] Configure SMTP via Admin → Settings → Email after first login
- [ ] Enable HTTPS — Helmet's HSTS will activate automatically in production
- [ ] Configure a reverse proxy (nginx/Caddy) to forward `:8000` externally

### Frontend

```bash
npm run build --workspace frontend
# Output: frontend/dist/
```

Serve `frontend/dist` from any static host (Nginx, Vercel, Netlify, S3+CloudFront).

Environment variable required at **build time**:

```env
VITE_API_URL=https://your-api-domain.com/api
```

### AI Service

The recommended production launch on the server:

```bash
cd ai-service
source venv/bin/activate
python launch.py
```

Or via uvicorn directly:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 1
```

> Keep `--workers 1` — the model is loaded into a single process and is not safe to share across workers without additional coordination.

---

## Troubleshooting

### "Too many login attempts — try again later"

The auth rate limiter skips `localhost` in development automatically. If you see this in a non-localhost environment:

- Verify the backend is running the latest code (restart the dev server).
- Confirm you are using the seeded admin credentials: `admin@example.com` / `abc123456`.
- Check `MONGODB_URI` in `backend/.env` points to the same DB the seed was run against.

### "AI service unavailable — try again shortly"

1. Confirm the AI service process is running: `curl http://localhost:8001/api/health`.
2. Check `GET /api/health` response — the `model_loading` field indicates if the model is still downloading.
3. If the port is in use from a previous crash: `npm run dev:ai` runs `launch.py` which automatically frees port 8001 before starting.
4. Check the terminal running the AI service for Python errors.

### "Port already in use" on Windows

The `launch.py` script uses PowerShell `Get-NetTCPConnection` / `Remove-NetTCPConnection` to kill ghost TCP handles before binding. If you still see the error:

```powershell
# Manually kill whatever is on port 8001
$p = (Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue).OwningProcess
if ($p) { Stop-Process -Id $p -Force }
```

### MongoDB connection refused

- Ensure MongoDB is running: `mongod --dbpath <path>` (or check the MongoDB service).
- Verify `MONGODB_URI` in `backend/.env` is correct.
- For Atlas, whitelist your IP in the Atlas network access settings.

### AI model download is very slow or fails

- The first download is ~500 MB from Hugging Face. Use a stable connection.
- Once downloaded the model is cached at `~/.cache/huggingface/hub/` and is not re-downloaded.
- To pre-download manually: `python -c "from transformers import AutoTokenizer, AutoModelForSeq2SeqLM; AutoTokenizer.from_pretrained('sshleifer/distilbart-cnn-12-6'); AutoModelForSeq2SeqLM.from_pretrained('sshleifer/distilbart-cnn-12-6')"` from within the activated venv.

### Patient email verification required

If `ENFORCE_EMAIL_VERIFICATION=true` is set in `backend/.env`, non-admin accounts must verify their email before login. You can either:

- Disable the flag during development.
- Verify manually via the API: `POST /api/auth/verify-email/:token` (token is logged by the backend if no SMTP is configured).
- Configure SMTP in Admin → Settings → Email so verification emails send automatically.

### Summary is too short / not generated

1. Check the AI service health: `GET http://localhost:8001/api/health`.
2. Ensure the model has finished loading (`model_loaded: true`).
3. Verify the report is at least 30 words (the minimum for summarization).
4. Check the timeout configured in Admin → Settings → AI Service (minimum 60 s recommended for CPU inference).

---

## License

**Private — All rights reserved.**

This software and its source code are proprietary. Unauthorised copying, distribution, modification, or use is strictly prohibited without explicit written permission from the project owner.
