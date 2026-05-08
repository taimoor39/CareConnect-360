# CareConnect 360 — Healthcare CRM & Automation Platform

Full-stack MERN application for clinic operations management featuring multi-role dashboards, appointment scheduling, billing, AI-powered medical report summarization, and an automated patient engagement engine.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Recharts, React Router 7 |
| Backend | Node.js, Express 4, Mongoose 8 (MongoDB) |
| Auth | JWT (access tokens), bcrypt password hashing |
| Email | Nodemailer with admin-configurable SMTP |
| Scheduling | node-cron (timezone-aware, Asia/Karachi) |
| AI Service | External microservice (Facebook BART) for report summarization |
| PDF | PDFKit (server-side invoice generation), jsPDF (client-side export) |
| QR Codes | qrcode (server), html5-qrcode (client scanner) |

## Architecture

```
project/
├── backend/          Express API (ES modules)
│   ├── src/
│   │   ├── config/         DB connection, seeders config
│   │   ├── controllers/    Route handlers (18 controllers)
│   │   ├── jobs/           Cron job definitions
│   │   ├── middleware/      Auth, validation, security (Helmet, CORS, rate limiting)
│   │   ├── models/         Mongoose schemas (14 models)
│   │   ├── routes/         Express routers (18 route files)
│   │   ├── seeders/        Admin & menu seeder
│   │   ├── utils/          Shared helpers (audit, email, dates, PDF, queries)
│   │   ├── validators/     express-validator rule sets
│   │   └── server.js       App entry point
│   └── package.json
├── frontend/         React SPA
│   ├── src/
│   │   ├── api/            Axios API client modules
│   │   ├── components/     Reusable UI (dashboard, patients, doctors, settings, etc.)
│   │   ├── hooks/          Custom React hooks
│   │   ├── pages/          Route-level pages (33 pages across 4 portals)
│   │   └── utils/          Date, formatting, ISO helpers
│   └── package.json
└── package.json      Monorepo root (npm workspaces + concurrently)
```

## Role-Based Portals

### Admin
- Dashboard with clinic-wide KPIs and analytics charts
- Patient management (CRUD, search, archive, patient-code generation)
- Doctor management (profiles, schedules, specializations)
- Appointment management (scheduling, status workflow, QR check-in)
- Billing & invoicing (PDF generation, payment tracking)
- User management (create/edit, role assignment, password reset, temporary passwords)
- Audit logs (filterable, paginated activity trail)
- System settings (SMTP, security, cron schedules, clinic info, AI service, medical terms, email templates)
- Analytics dashboard (patient trends, appointment stats, revenue)

### Doctor
- Personal dashboard (today/week schedule, pending summaries)
- Patient list (scoped to doctor's own patients)
- Consultations (create, edit, follow-up dates, draft mode)
- Prescriptions (multi-item with dosage, frequency, duration)
- Medical reports (upload PDF/text, AI summarization, approve/reject/edit summaries)
- Schedule view

### Receptionist
- Dashboard (daily appointment overview)
- Patient registration and lookup
- Appointment scheduling
- QR code check-in scanning
- Billing and payment collection

### Patient
- Personal dashboard
- View appointments and history
- Access prescriptions
- View approved AI report summaries
- Download invoices
- Profile management

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
| User | Authentication, roles (admin/doctor/receptionist/patient) |
| Patient | Demographics, medical history, insurance, emergency contact |
| DoctorProfile | Schedule, specialization, qualification |
| Appointment | Date/time slots, status workflow, QR codes |
| Consultation | Doctor notes, diagnosis, symptoms, follow-up |
| Prescription | Multi-item medicines with dosage instructions |
| MedicalReport | PDF/text uploads for AI processing |
| ReportSummary | AI-generated summaries with approval workflow |
| Invoice | Line items, tax, payment status, PDF generation |
| EngagementLog | Engagement email audit trail (rule, status, errors) |
| AuditLog | System-wide activity log with IP/user-agent tracking |
| SystemSettings | Singleton config (SMTP, security, clinic, cron, AI, templates) |
| MedicalTerm | Medical-to-simplified term dictionary |
| Menu | Dynamic sidebar menu configuration |

## API Routes

| Prefix | Purpose |
|---|---|
| `/api/auth` | Login, forgot/reset password, token verify |
| `/api/users` | User CRUD, status toggle, role change, password reset |
| `/api/patients` | Patient CRUD, search, stats, archive |
| `/api/doctors` | Doctor listing and profiles |
| `/api/appointments` | Scheduling, status transitions, QR check-in |
| `/api/billing` | Invoice CRUD, PDF generation, payment |
| `/api/doctor` | Doctor portal (consultations, prescriptions, reports, AI summaries) |
| `/api/patient` | Patient portal (appointments, prescriptions, reports, invoices) |
| `/api/receptionist` | Receptionist workflows |
| `/api/dashboard` | Role-aware dashboard stats |
| `/api/analytics` | Charts and trend data |
| `/api/engagement` | Engagement logs, stats, test emails |
| `/api/settings` | System configuration (email, security, clinic, cron, AI, templates) |
| `/api/audit` | Audit log queries |
| `/api/admin` | Admin-specific operations |
| `/api/staff` | Staff management |
| `/api/menus` | Dynamic menu configuration |
| `/api/seeders` | Database seeding |

## Setup

### Prerequisites

- Node.js 18+
- MongoDB 6+ (local or Atlas)
- Gmail App Password (for SMTP) or other SMTP provider

### Installation

```bash
# Clone and install all workspaces
git clone <repo-url> && cd careconnect-360
npm install
```

### Environment

Copy `backend/.env.example` to `backend/.env` and configure:

```env
PORT=8000
MONGODB_URI=mongodb://127.0.0.1:27017/careconnect360
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
SYSTEM_USER_ID=           # Optional: MongoDB ObjectId for system audit entries
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

This project includes the AI microservice in `ai-service/` (FastAPI).

Windows PowerShell:

```powershell
cd c:\project\ai-service
.\venv\Scripts\Activate
uvicorn main:app --reload --port 8001
```
Quick health check:
```powershell
curl http://localhost:8001/api/health
```

### Seed Data

The backend reads seeder defaults from `backend/src/config/seeders.json`.

Current seeded admin credentials:

- Email: `admin@example.com`
- Password: `abc123456`

To run seeders:

1. Start backend (`npm run dev` at project root, or backend workspace directly).
2. Login as an existing admin.
3. Call `POST /api/seeders/run`.

### Run

```bash
# Both services (backend :8000, frontend :5173)
npm run dev

# Or individually
npm run dev:backend
npm run dev:frontend
```

### Login Troubleshooting (Local Development)

If login shows **"Too many login attempts — please try again later"** during local testing:

- Make sure backend is running with latest code (restart dev server).
- In non-production, auth limiter now skips localhost requests.
- Use seeded credentials from `backend/src/config/seeders.json`:
  - `admin@example.com / abc123456`
- Confirm MongoDB points to the same DB where seeded user exists (`backend/.env` `MONGODB_URI`).

### Production Build

```bash
cd frontend && npm run build   # outputs to frontend/dist
cd backend && npm start        # runs without nodemon
```

## Security

- Helmet security headers on every response
- Global rate limiting (configurable per-IP)
- Patient portal additional rate limit (100 req / 15 min)
- JWT authentication with configurable expiry
- Password policy enforcement (min length, uppercase, numbers)
- bcrypt password hashing (auto-salt)
- CORS origin whitelist
- Input validation on all endpoints (express-validator)
- Audit logging with IP address and user-agent tracking
- SMTP password never returned to frontend (masked on read)

## License

Private — All rights reserved.
