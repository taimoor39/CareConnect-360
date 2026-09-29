# CareConnect-360 Reverse Engineering (Phases 1–5)

## Scope and Constraints

- Repository: `/home/runner/work/CareConnect-360/CareConnect-360`
- Focused services/directories:
  - `/home/runner/work/CareConnect-360/CareConnect-360/backend`
  - `/home/runner/work/CareConnect-360/CareConnect-360/ai-service`
- No code modifications were performed during analysis phases; this document consolidates the chat findings with phase-specific headings.

---

## Phase 1: Reverse Engineering (Structure, Entry Points, Startup, Cross-Service Flow)

### 1.1 Path Clarification

- The actual directory is `ai-service` (hyphenated), not `ai service`.
- Evidence path: `/home/runner/work/CareConnect-360/CareConnect-360/ai-service`

### 1.2 Directory Trees (Evidence-Based)

#### Backend

```text
backend/
  .env.example
  package.json
  scripts/
    free-port.js
    patient-role-e2e.mjs
    seed-admin.js
  src/
    server.js
    config/db.js
    controllers/...
    routes/...
    models/...
    middleware/...
    services/...
    utils/...
    validators/...
    jobs/...
    docs/openApiSpec.js
    realtime/adminRealtime.js
```

#### AI Service

```text
ai-service/
  .env.example
  requirements.txt
  launch.py
  start.bat
  app/
    main.py
    api/
      router.py
      endpoints/
        health.py
        summarize.py
        terms.py
    core/
      config.py
      constants.py
    schemas/
      summarize.py
    services/
      summarizer.py
      token_guard.py
      medical_terms.py
      medical_dictionary.py
      pdf_text.py
```

### 1.3 Entry Points and Startup

#### Backend (Express)

- Main entrypoint: `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/server.js`
- Startup scripts:
  - `dev`: `node scripts/free-port.js 8000 && nodemon src/server.js`
  - `start`: `node src/server.js`
  - Source: `/home/runner/work/CareConnect-360/CareConnect-360/backend/package.json`
- Default runtime port:
  - `PORT || 8000` in `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/server.js`
  - `PORT=8000` in `/home/runner/work/CareConnect-360/CareConnect-360/backend/.env.example`

#### AI Service (FastAPI)

- App entrypoint: `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/main.py`
- Launcher: `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/launch.py`
- Default runtime port: `8001` in `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/launch.py`
- Run command (documented): `python -m uvicorn app.main:app --host 0.0.0.0 --port 8001` in `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/requirements.txt`

### 1.4 Config Files

- Backend:
  - `/home/runner/work/CareConnect-360/CareConnect-360/backend/.env.example`
  - `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/models/SystemSettings.js`
- AI service:
  - `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/.env.example`
  - `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/core/constants.py`
  - `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/core/config.py`

### 1.5 Backend ↔ AI Request/Data Flow

1. Backend doctor routes expose summarize endpoints in:
   - `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/routes/doctorPortalRoutes.js`
2. Controller summarization flow lives in:
   - `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/controllers/doctorPortalController.js`
3. Backend sends either:
   - `POST {aiUrl}/api/summarize` (JSON) or
   - `POST {aiUrl}/api/summarize-pdf` (multipart)
4. AI endpoints are defined in:
   - `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/api/endpoints/summarize.py`
5. AI returns summary metadata; backend writes it into consultation report summary fields.

---

## Phase 2: Data & Configuration Layer

### 2.1 Database Schemas / ORM

#### Backend (MongoDB + Mongoose)

- Mongoose connection/config:
  - `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/config/db.js`
- Core models:
  - `User.js`
  - `Patient.js`
  - `Appointment.js`
  - `Consultation.js`
  - `SystemSettings.js`
  - `MedicalTerm.js`
  - `Invoice.js`
  - `PortalAccessRequest.js`
  - `DoctorProfile.js`
  - `EngagementLog.js`
  - `AuditLog.js`
  - `Menu.js`

#### AI Service

- No persistence ORM found (no SQLAlchemy/Mongo drivers in service code path).
- Uses Pydantic request/response schemas:
  - `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/schemas/summarize.py`

### 2.2 Environment Variables

#### Backend

- Example env file:
  - `/home/runner/work/CareConnect-360/CareConnect-360/backend/.env.example`
- Used in code:
  - `PORT`, `TZ`, `MONGODB_URI`, `MONGO_URI`
  - `JWT_SECRET`, `JWT_EXPIRES_IN`
  - `FRONTEND_URL`
  - `AI_SERVICE_URL`
  - `ENFORCE_EMAIL_VERIFICATION`
  - `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`
  - `SYSTEM_USER_ID`
  - legacy SMTP env references in doctor welcome email flow

#### AI Service

- Env-backed constants:
  - `SUMMARIZATION_MODEL_ID`
  - `MODEL_LOAD_TIMEOUT_SEC`
  - `REQUEST_MODEL_WAIT_SEC`
  - `BART_INFERENCE_TIMEOUT_SEC`
- Source:
  - `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/core/constants.py`

### 2.3 State Management

#### Backend runtime state

- `global.cronTasks` scheduler registry:
  - `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/server.js`
  - `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/jobs/appointmentJobs.js`
- Socket.IO singleton `ioInstance`:
  - `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/realtime/adminRealtime.js`
- cached settings in email service:
  - `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/utils/emailService.js`

#### AI runtime state

- summarizer in-memory globals:
  - model/tokenizer load status, locks, thread pools, fallback flags
  - source: `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/services/summarizer.py`

---

## Phase 3: Service Architecture & API Routing

### 3.1 Backend Global Middleware and Router Mounting

- Middleware order + health/openapi/docs + mounted route modules:
  - `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/server.js`

### 3.2 Route Groups (Backend)

- Mounted modules:
  - `/api/admin`
  - `/api/analytics`
  - `/api/audit`
  - `/api/appointments`
  - `/api/auth`
  - `/api/billing`
  - `/api/dashboard`
  - `/api/doctors`
  - `/api/doctor`
  - `/api/engagement`
  - `/api/menus`
  - `/api/patient`
  - `/api/patients`
  - `/api/portal-access`
  - `/api/seeders`
  - `/api/settings`
  - `/api/staff`
  - `/api/users`
  - `/api/receptionist`

### 3.3 Middleware Roles

- Auth and role gates:
  - `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/middleware/auth.js`
- Validation response shaping:
  - `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/middleware/validate.js`
- Async error forwarding wrapper:
  - `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/utils/asyncHandler.js`

### 3.4 AI Service Routing

- Router aggregation:
  - `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/api/router.py`
- Endpoints:
  - `GET /api/health`
  - `GET /api/terms`
  - `POST /api/summarize`
  - `POST /api/summarize-pdf`

---

## Phase 4: AI Model Integration & Pipeline Logic

### 4.1 Model Loading

- Non-blocking warmup via FastAPI lifespan:
  - `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/main.py`
- Background model load implementation:
  - `_load_bart_sync`, `_start_background_load`, `wait_for_model_ready`
  - source: `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/services/summarizer.py`

### 4.2 Inference Functions

- Generation config:
  - `_generate_kwargs`
- Inference calls:
  - `_run_bart`
  - `_run_bart_bounded`
- Public async API:
  - `summarize_report`
- Source:
  - `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/services/summarizer.py`

### 4.3 Prompting Strategy

- No separate chat-style prompt template.
- Pipeline uses direct seq2seq summarization on cleaned clinical text through HuggingFace `generate`.

### 4.4 Pre/Post Processing

- Input guards/token limits:
  - `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/services/token_guard.py`
- PDF extraction:
  - `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/services/pdf_text.py`
- Text cleaning before inference:
  - disclaimer stripping, header removal, parenthetical cleanup
  - `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/services/summarizer.py`
- Dictionary simplification + replacement tracking:
  - `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/services/medical_dictionary.py`
  - `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/services/medical_terms.py`

---

## Phase 5: Step-by-Step Code Walkthrough (File-by-File, Function-by-Function)

### 5.1 Backend Startup & Request Lifecycle

1. `server.js` boots Express, applies middleware, mounts routers, defines error chain, starts DB/cron/socket.
2. Route modules (`src/routes/*.js`) map URL paths to controller exports with middleware stacks.
3. Controllers execute business logic and rely on services/utils for reusable domain operations.

### 5.2 Function-Level Walkthrough (Backend Helpers/Services)

#### `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/services/appointmentService.js`

- `startEndOfDate`
- `autoMarkMissedAppointments`
- `VALID_TRANSITIONS`
- `attachDoctorProfiles`
- `applyRoleScope`
- `populateAndEnrich`
- `performAppointmentCheckIn`

#### `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/services/billingService.js`

- `buildAmounts`
- `populateInvoice`
- `attachSpecialization`
- `enrichedInvoice`
- `findInvoiceOrFail`
- `resolveRefId`
- `assertPatientOwnsInvoice`

#### `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/utils/consultationHelpers.js`

- `resolveIsDraftForSave`
- `patientVisibleConsultationClause`
- `toConsultationBundle`
- `reportSummaryStatus`
- `toPatientReportRow`
- `toDoctorReportRow`
- `toPrescriptionRow`

#### `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/utils/audit.js`

- `createAudit`
- `auditFromReq`

#### `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/utils/auditLogger.js`

- `inferTargetCollection`
- `resolveIp`
- default `auditLogger`

#### `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/utils/dateTime.js`

- `isISODateOnly`
- `toPakistanISODate`
- `dayBoundsInPakistan`
- `todayBoundsInPakistan`
- `getTodayRangePKT`

#### `/home/runner/work/CareConnect-360/CareConnect-360/backend/src/utils/query.js`

- `parsePagination`
- `paginationMeta`
- `escapeRegex`
- `searchRegex`
- `parseName`
- `buildFullName`

### 5.3 Function-Level Walkthrough (AI Service)

#### `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/api/endpoints/summarize.py`

- `_require_summarize_text`
- `_run_summarize`
- `summarize_report_endpoint`
- `summarize_pdf`

#### `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/services/token_guard.py`

- `set_shared_tokenizer`
- `get_tokenizer`
- `count_tokens`
- `truncate_to_token_limit`
- `clamp_word_window`
- `validate_and_prepare_input`
- `prepare_text_for_bart`

#### `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/services/summarizer.py`

- `_load_bart_sync`
- `_start_background_load`
- `_ensure_load_started`
- `wait_for_model_ready`
- `_generate_kwargs`
- `_clear_generation_residue`
- `_run_bart`
- `_run_bart_bounded`
- `_strip_disclaimers`
- `_strip_section_headers`
- `_strip_parentheticals_from_input`
- `_post_clean_summary`
- `_fix_sentence_punctuation`
- `_extractive_fallback`
- `_input_fingerprint`
- `summarize_text`
- `warmup_summarizer`
- `summarizer_status`
- `_clamp_target_words`
- `summarize_report`

#### `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/services/medical_dictionary.py`

- `dedupe_parenthetical_phrases`
- `apply_medical_dictionary`

#### `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/services/medical_terms.py`

- `get_python_terms`

#### `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/services/pdf_text.py`

- `extract_text_from_pdf_bytes`

#### `/home/runner/work/CareConnect-360/CareConnect-360/ai-service/app/schemas/summarize.py`

- `sanitize_extra_medical_terms_dict`
- `parse_extra_medical_terms_json`
- `SummarizeRequest.normalize_term_maps`
- `SummarizeRequest.resolved_admin_terms`
- `SummarizeResponse` contract

---

## Next Suggested Continuation

If continuing the same sequence, the next practical phase is:

- **Phase 6: Request Traces**
  - doctor summary generation trace (`/api/doctor/.../summarize`)
  - patient report retrieval trace (`/api/patient/reports`)
  - appointment QR check-in trace (`/api/appointments/checkin` and `/api/appointments/checkin/image`)

