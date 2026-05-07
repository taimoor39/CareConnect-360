import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (!process.env.TZ) {
  process.env.TZ = 'Asia/Karachi';
}

import { connectDB, disconnectDB } from './config/db.js';
import { startCronJobs } from './jobs/appointmentJobs.js';
import { JSON_BODY_LIMIT, globalLimiter, securityHeaders } from './middleware/security.js';
import SystemSettings from './models/SystemSettings.js';
import adminRoutes from './routes/adminRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import authRoutes from './routes/authRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import doctorPortalRoutes from './routes/doctorPortalRoutes.js';
import engagementRoutes from './routes/engagementRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import patientPortalRoutes from './routes/patientPortalRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import portalAccessRoutes from './routes/portalAccessRoutes.js';
import seedRoutes from './routes/seedRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import userRoutes from './routes/userRoutes.js';
import receptionistRoutes from './routes/receptionistRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
global.cronTasks = global.cronTasks || {};
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

// ─── Middleware (order is critical) ──────────────────────────────────────
// 1. trust proxy: so req.ip reflects the real client IP behind a reverse
//    proxy (required for the rate limiter and audit logs).
// 2. securityHeaders: apply before anything else so every response — even
//    errors from parsers or rate-limit rejections — carries them.
// 3. globalLimiter: reject abusive clients BEFORE spending CPU on CORS
//    pre-flight or JSON parsing.
// 4. cors:         negotiate origin before the body is parsed.
// 5. express.json: parse bodies with an explicit size cap.
app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(globalLimiter);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: ${origin}`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.options('*', cors());
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true }));

const patientPortalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests' },
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/doctor', doctorPortalRoutes);
app.use('/api/engagement', engagementRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/patient', patientPortalLimiter, patientPortalRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/portal-access', portalAccessRoutes);
app.use('/api/seeders', seedRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/users', userRoutes);
app.use('/api/receptionist', receptionistRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────
// Must come AFTER all route registrations but BEFORE the error handler.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Global error handler ─────────────────────────────────────────────────
app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (statusCode === 500 && !isProduction) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && isProduction ? 'Internal Server Error' : (error.message || 'Internal Server Error'),
    errors: Array.isArray(error.errors) ? error.errors : [],
  });
});

// ─── Startup / shutdown ───────────────────────────────────────────────────
const port = process.env.PORT || 8000;
let httpServer;

const initializeSystemSettings = async () => (
  SystemSettings.findOneAndUpdate(
    {},
    {
      $setOnInsert: {
        singletonKey: 'default',
        emailTemplates: {
          appointmentReminder: {
            subject: 'Reminder: Your appointment tomorrow at {time}',
            body: `
              <h2 style="color:#1e293b;">Appointment Reminder</h2>
              <p style="color:#475569; line-height:1.6;">Dear <strong>{patientName}</strong>,</p>
              <p style="color:#475569; line-height:1.6;">This is a friendly reminder that you have an appointment scheduled for tomorrow.</p>
              <div style="background:#f8fafc; border-left:4px solid #0d9488; padding:16px; margin:20px 0; border-radius:4px;">
                <p style="margin:4px 0; color:#1e293b;"><strong>Doctor:</strong> Dr. {doctorName}</p>
                <p style="margin:4px 0; color:#1e293b;"><strong>Date:</strong> {date}</p>
                <p style="margin:4px 0; color:#1e293b;"><strong>Time:</strong> {time}</p>
              </div>
              <p style="color:#475569;">Please arrive 10 minutes early. Bring this email or your QR code for check-in.</p>
              <p style="color:#475569;">If you need to reschedule, please contact reception at <strong>{clinicPhone}</strong></p>
            `,
          },
          missedAppointment: {
            subject: "We missed you today — Let's reschedule",
            body: `
              <h2 style="color:#1e293b;">We missed you today</h2>
              <p style="color:#475569; line-height:1.6;">Dear <strong>{patientName}</strong>,</p>
              <p style="color:#475569; line-height:1.6;">We noticed you were unable to make it to your appointment with Dr. {doctorName} on {date}. We hope everything is okay.</p>
              <p style="color:#475569;">To reschedule your appointment, please contact our reception team:</p>
              <p style="color:#475569;">{clinicPhone}<br>{clinicEmail}</p>
            `,
          },
          prescriptionRenewal: {
            subject: 'Prescription renewal reminder — {renewalDate}',
            body: `
              <h2 style="color:#1e293b;">Prescription Renewal Reminder</h2>
              <p style="color:#475569; line-height:1.6;">Dear <strong>{patientName}</strong>,</p>
              <p style="color:#475569; line-height:1.6;">Your follow-up appointment with Dr. {doctorName} is coming up on <strong>{renewalDate}</strong>.</p>
              <p style="color:#475569;">Current medications: {medicationList}</p>
              <p style="color:#475569;">Please contact reception to confirm your appointment: {clinicPhone}</p>
            `,
          },
          reEngagement: {
            subject: "We haven't seen you in a while, {patientName}",
            body: `
              <h2 style="color:#1e293b;">We miss you at {clinicName}</h2>
              <p style="color:#475569; line-height:1.6;">Dear <strong>{patientName}</strong>,</p>
              <p style="color:#475569; line-height:1.6;">It has been a while since your last visit on <strong>{lastVisitDate}</strong>. Your health is our priority and we would love to see you again.</p>
              <p style="color:#475569;">To book an appointment, contact us at:<br>{clinicPhone}<br>{clinicEmail}</p>
            `,
          },
          aiSummaryReady: {
            subject: 'Your medical report summary is ready',
            body: `
              <h2 style="color:#1e293b;">Report Summary Available</h2>
              <p style="color:#475569; line-height:1.6;">Dear <strong>{patientName}</strong>,</p>
              <p style="color:#475569; line-height:1.6;">Your doctor has reviewed and approved the summary for your report: <strong>{reportTitle}</strong></p>
              <p style="color:#475569; line-height:1.6;">You can now view your simplified health summary by logging into your patient portal.</p>
              <div style="text-align:center; margin:24px 0;">
                <a href="{portalLink}" style="background:#0d9488; color:#fff; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:bold;">View My Report</a>
              </div>
              <p style="color:#94a3b8; font-size:12px;">This summary is for informational purposes only and does not constitute medical advice.</p>
            `,
          },
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
);

const shutdown = async (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`);

  // Stop accepting new connections; existing in-flight requests finish.
  httpServer?.close(() => console.log('HTTP server closed'));

  try {
    await disconnectDB();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err.message);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    await connectDB();
    const settings = await initializeSystemSettings();
    const schedules = settings?.cronJobs || {};
    startCronJobs({
      appointmentReminder: schedules?.appointmentReminder?.enabled === false
        ? false
        : schedules?.appointmentReminder?.schedule,
      prescriptionRenewal: schedules?.prescriptionRenewal?.enabled === false
        ? false
        : schedules?.prescriptionRenewal?.schedule,
      reEngagement: schedules?.patientReEngagement?.enabled === false
        ? false
        : schedules?.patientReEngagement?.schedule,
    });
    httpServer = app.listen(port, () => console.log(`Server is running on port ${port}`));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

startServer();
