# CareConnect 360 — Healthcare CRM & Automation Platform

Full-stack MERN application for clinic operations management featuring multi-role dashboards, appointment scheduling, billing, AI-powered medical report summarization, patient portal access workflows, and an automated patient engagement engine.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, Tailwind CSS, Recharts, React Router 7, Socket.IO client |
| Backend | Node.js, Express 4, Mongoose 8 (MongoDB), Socket.IO |
| Auth | JWT (access tokens, optional `tv` token-version claim), bcrypt password hashing |
| Email | Nodemailer with admin-configurable SMTP |
| Scheduling | node-cron (timezone-aware, Asia/Karachi) |
| Real-time | Socket.IO on the same HTTP server (`/socket.io`), admin-only push hints |
| AI Service | FastAPI microservice; Hugging Face `facebook/bart-large-cnn` summarization (with text fallback) |
| PDF | PDFKit (server-side invoice generation), jsPDF (client-side export) |
| QR Codes | qrcode + jsQR (server decode), html5-qrcode (camera scanner), optional upload flow |

## Architecture

```
CareConnect360/
├── backend/          Express API (ES modules)
│   ├── src/
│   │   ├── config/         DB connection
│   │   ├── controllers/    Route handlers (19 controllers)
│   │   ├── jobs/           Cron job definitions
│   │   ├── middleware/     Auth, validation, security (Helmet, CORS, rate limiting)
│   │   ├── models/         Mongoose schemas (16 models)
│   │   ├── realtime/       Socket.IO admin channel (`adminRealtime.js`)
│   │   ├── routes/         Express routers (19 route modules)
│   │   ├── seeders/        Default admin bootstrap (`admin.defaults.json` + runner)
│   │   ├── utils/          Shared helpers (audit, email, dates, PDF, queries, JWT)
│   │   ├── validators/     express-validator rule sets
│   │   └── server.js       App entry (HTTP + Socket.IO)
│   └── package.json
├── frontend/         React SPA
│   ├── src/
│   │   ├── api/            Axios API client modules
│   │   ├── components/     Reusable UI (dashboard, patients, doctors, receptionist, etc.)
│   │   ├── hooks/          Custom React hooks
│   │   ├── pages/          Route-level pages (33 JSX pages across portals)
│   │   └── utils/          Dates, formatting, ISO helpers, admin realtime client
│   └── package.json
├── ai-service/       Python FastAPI service (summarize, health, medical terms)
├── scripts/          Root helper scripts (e.g. health-check)
└── package.json      Monorepo root (npm workspaces: frontend + backend; AI via script)
```

## Role-Based Portals

### Admin
- Dashboard with clinic-wide KPIs and analytics charts (poll/focus refresh plus push hints)
- Patient management (CRUD, search, archive, patient-code generation)
- Doctor management (profiles, schedules, specializations, active status)
- Appointment management (scheduling, status workflow, QR check-in)
- Billing & invoicing (PDF generation, payment tracking)
- User management (create/edit, role assignment, password reset, temporary passwords)
- Patient portal access requests (approve/reject/reopen; stats drive sidebar badges)
- Audit logs (filterable, paginated activity trail)
- System settings (SMTP, security, cron schedules, clinic info, AI service, medical terms, email templates)
- Analytics dashboard (patient trends, appointment stats, revenue)

### Doctor
- Personal dashboard (today/week schedule, pending summaries)
- Patient list (scoped to assigned patients)
- Consultations (create, edit, follow-up dates, draft mode)
- Prescriptions (multi-item with dosage, frequency, duration)
- Medical reports (upload PDF/text, AI summarization, approve/reject/edit summaries)
- Schedule view

### Receptionist
- Dashboard (daily appointment overview)
- Patient registration and lookup
- Appointment scheduling
- QR code check-in (camera scanner and image upload where supported)
- Billing and payment collection

### Patient
- Personal dashboard
- View appointments and history
- Access prescriptions
- View approved AI report summaries
- Download invoices
- Profile management (portal access subject to admin approval workflow)

## Admin real-time updates (Socket.IO)

Connected **admin** browsers receive `admin:refresh` events after relevant mutations (dashboard KPIs, billing aggregates, portal-access badge counts). The shared client strips `/api` from `VITE_API_URL` / `VITE_API_BASE_URL` and opens Socket.IO against the API origin on path `/socket.io`.

- Handshake auth: JWT in `socket.handshake.auth.token` (or `query.token`); user must be active admin with matching token version (`tv` claim).
- Payload shape (typical): `{ ts, scopes?: ('dashboard'|'portalBadge'|'billing')[], reason?: string }`. Empty `scopes` is treated as a broadcast hint.

**Staging/production:** reverse proxies and CDNs must allow **WebSocket upgrades** (and sticky sessions if you scale HTTP) for `/socket.io`.

## Patient Engagement Engine (FR48–FR52)

Automated communication system with 5 engagement rules:

| Rule | Trigger | Schedule |
|---|---|---|
| ER-1 | Appointment 24hrs away | Daily 9:00 AM PKT |
| ER-2 | Appointment marked Missed | Daily 11:58 PM PKT (after missed-detector) |
| ER-3 | Prescription follow-up in 7 days | Daily 8:00 AM PKT |
| ER-4 | Patient inactive > 6 months | Daily 10:00 AM PKT (weekly dedup) |
| ER-5 | Doctor approves AI summary | Immediate (fire-and-forget) |

Features:
- Duplicate send prevention (daily for ER-1/2/3/5, weekly for ER-4)
- `EngagementLog` collection for full audit trail
- Admin API endpoints: `GET /api/engagement/logs`, `GET /api/engagement/stats`, `POST /api/engagement/test/:ruleId`
- Dynamic cron rescheduling from admin Settings panel
- Admin-editable HTML email templates with `{variable}` substitution
- Graceful error handling (per-patient try/catch, never crashes cron loop)
- SMTP settings cached with 5-min TTL + instant invalidation on config change

## Data Models

| Model | Purpose |
|---|---|
| User | Authentication, roles (admin/doctor/receptionist/patient), token versioning |
| Patient | Demographics, medical history, insurance, emergency contact |
| DoctorProfile | Schedule, specialization, qualification |
| Appointment | Date/time slots, status workflow, QR codes |
| Consultation | Doctor notes, diagnosis, symptoms, follow-up |
| Prescription | Multi-item medicines with dosage instructions |
| MedicalReport | PDF/text uploads for AI processing |
| ReportSummary | AI-generated summaries with approval workflow |
| Invoice | Line items, tax, payment status, PDF generation |
| PortalAccessRequest | Patient portal onboarding requests (pending/approved/rejected) |
| EngagementLog | Engagement email audit trail (rule, status, errors) |
| AuditLog | System-wide activity log with IP/user-agent tracking |
| SystemSettings | Singleton config (SMTP, security, clinic, cron, AI, templates) |
| MedicalTerm | Medical-to-simplified term dictionary |
| Menu | Dynamic sidebar menu configuration |

## API Routes

| Prefix | Purpose |
|---|---|
| `/api/auth` | Login, patient register, email verify/resend, forgot/reset password |
| `/api/openapi.json`, `/api/docs` | OpenAPI JSON + Swagger UI (API docs) |
| `/api/users` | User CRUD, status toggle, role change, password reset |
| `/api/patients` | Patient CRUD, search, stats, archive |
| `/api/doctors` | Doctor listing and profiles |
| `/api/appointments` | Scheduling, status transitions, QR check-in |
| `/api/billing` | Invoice CRUD, PDF generation, payment |
| `/api/doctor` | Doctor portal (consultations, prescriptions, reports, AI summaries) |
| `/api/patient` | Patient portal (appointments, prescriptions, reports, invoices) |
| `/api/receptionist` | Receptionist workflows |
| `/api/portal-access` | Portal access requests and admin stats |
| `/api/dashboard` | Role-aware dashboard stats |
| `/api/analytics` | Charts and trend data |
| `/api/engagement` | Engagement logs, stats, test emails |
| `/api/settings` | System configuration (email, security, clinic, cron, AI, templates) |
| `/api/audit` | Audit log queries |
| `/api/admin` | Admin-specific operations |
| `/api/staff` | Staff management |
| `/api/menus` | Dynamic menu configuration |
| `/api/seeders` | Database seeding |

Socket.IO is mounted on the **same origin/port as the API** (not under `/api`).

## Setup

### Prerequisites

- Node.js 18+
- MongoDB 6+ (local or Atlas)
- Python 3.10+ with a virtualenv under `ai-service/venv` (for local AI service)
- Gmail App Password (for SMTP) or other SMTP provider

### Installation

```bash
git clone <repo-url>
cd CareConnect360
npm install
```

Create **`backend/.env`** (there is no committed template in-repo). Minimum:

```env
PORT=8000
MONGODB_URI=mongodb://127.0.0.1:27017/careconnect360
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
SYSTEM_USER_ID=           # Optional: MongoDB ObjectId for system audit entries
```

Frontend (`frontend/.env` or `.env.local`):

```env
VITE_API_URL=http://localhost:8000/api
```

SMTP is configured at runtime through the admin Settings panel (not `.env`).

### AI Service Configuration

AI summarization is configured from **Admin Panel → Settings → AI Service**.

Set the following fields:

- `AI Service URL` (example: `http://localhost:8001`)
- `Request Timeout (seconds)` (allowed range: 5–120)
- `Max Report Length` (allowed range: 500–50000)
- `AI Summarization Enabled` (toggle)
- `Auto-summarize on Upload` (toggle)

How to verify:

1. Save AI Service settings.
2. Click **Check Connection** in the AI Service section.
3. Confirm status is `online` (or investigate if `slow` / `error`).

Notes:

- Backend health check endpoint is `GET /api/settings/ai-health`.
- Report summarization calls the AI service from doctor portal flows.
- Doctor approval remains required before summaries become visible to patients.

### Run AI Microservice (Port 8001)

The service lives in `ai-service/` (FastAPI). From the repo root on Windows, **`npm run dev`** already starts it alongside backend and frontend if `ai-service\venv` exists.

Manual run (from `ai-service/`):

```powershell
cd CareConnect360\ai-service
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Quick health check:

```powershell
curl http://localhost:8001/api/health
```

### Seed Data

Default admin credentials live in **`backend/src/seeders/admin.defaults.json`** (single source of truth).

- Email: `admin@example.com`
- Password: `abc123456`

**First-time bootstrap (recommended):** creates the admin if missing and verifies the password hash:

```bash
npm run seed:admin --workspace backend
```

**While logged in as admin:** `POST /api/seeders/run` runs the same admin seed (idempotent: skips if that email already exists).

### Run

```bash
# Backend (:8000), frontend (:5173), and AI (:8001) together
npm run dev

# Or individually
npm run dev:backend
npm run dev:frontend
npm run dev:ai
```

### Login Troubleshooting (Local Development)

If login shows **"Too many login attempts — please try again later"** during local testing:

- Make sure backend is running with latest code (restart dev server).
- In non-production, auth limiter skips localhost requests.
- Use seeded credentials from `backend/src/seeders/admin.defaults.json`:
  - `admin@example.com / abc123456`
- Confirm MongoDB points to the same DB where seeded user exists (`backend/.env` `MONGODB_URI`).
- Optional **`ENFORCE_EMAIL_VERIFICATION=true`** blocks login for unverified non-admin accounts until they complete `/verify-email/:token`.
- **Patient self-registration:** `POST /api/auth/register` (also `/register` in the SPA) creates a linked Patient + User; verification email is sent when SMTP is configured in Settings.
- **Staff users** created by admin are marked email-verified at creation; **portal-approved** patient accounts are verified when the clinic approves access.

### Production Build

```bash
npm run build --workspace frontend   # outputs to frontend/dist
npm start --workspace backend        # runs without nodemon
```

Serve static `frontend/dist` from your host or CDN; point `FRONTEND_URL` and CORS `allowedOrigins` at the deployed SPA origin. Ensure WebSockets to `/socket.io` work if you rely on admin push updates.

## Security

- Helmet security headers on every response
- Global rate limiting (configurable per-IP)
- Patient portal additional rate limit (100 req / 15 min)
- JWT authentication with configurable expiry and optional invalidation via token version
- Password policy enforcement (min length, uppercase, numbers)
- bcrypt password hashing (auto-salt)
- CORS origin whitelist
- Input validation on all endpoints (express-validator)
- Audit logging with IP address and user-agent tracking
- SMTP password never returned to frontend (masked on read)
- Admin Socket.IO connections rejected unless JWT verifies an active admin with matching `tv`

## License

Private — All rights reserved.
