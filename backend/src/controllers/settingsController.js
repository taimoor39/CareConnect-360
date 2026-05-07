import bcrypt from 'bcrypt';
import cron from 'node-cron';
import nodemailer from 'nodemailer';

import MedicalTerm from '../models/MedicalTerm.js';
import SystemSettings from '../models/SystemSettings.js';
import User from '../models/User.js';
import {
  runAppointmentReminders,
  runPatientReEngagements,
  runPrescriptionRenewals,
  startCronJobs,
} from '../jobs/appointmentJobs.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { auditFromReq } from '../utils/audit.js';
import { invalidateSettingsCache } from '../utils/emailService.js';
import { paginationMeta, parsePagination, searchRegex } from '../utils/query.js';

const TEMPLATE_KEYS = new Set([
  'appointmentReminder',
  'missedAppointment',
  'prescriptionRenewal',
  'reEngagement',
  'aiSummaryReady',
]);

const ensureSettings = async () => SystemSettings.findOneAndUpdate(
  {},
  { $setOnInsert: { singletonKey: 'default' } },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

const maskSmtpPass = (settings) => {
  if (!settings) return settings;
  const data = settings.toObject ? settings.toObject() : { ...settings };
  if (data?.email?.smtpPass) data.email.smtpPass = '••••••••';
  return data;
};

const shallowDiff = (before = {}, after = {}) => {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const diff = {};
  keys.forEach((key) => {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diff[key] = { from: before[key], to: after[key] };
    }
  });
  return diff;
};

const CRON_JOB_RUNNERS = {
  appointmentReminder: runAppointmentReminders,
  patientReEngagement: runPatientReEngagements,
  prescriptionRenewal: runPrescriptionRenewals,
};

const applyCronSchedules = (settings) => {
  const jobs = settings?.cronJobs || {};
  startCronJobs({
    appointmentReminder: jobs.appointmentReminder?.enabled ? jobs.appointmentReminder.schedule : false,
    prescriptionRenewal: jobs.prescriptionRenewal?.enabled ? jobs.prescriptionRenewal.schedule : false,
    reEngagement: jobs.patientReEngagement?.enabled ? jobs.patientReEngagement.schedule : false,
  });
};

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await ensureSettings();
  res.json({ success: true, data: maskSmtpPass(settings) });
});

export const updateSecuritySettings = asyncHandler(async (req, res) => {
  const current = await ensureSettings();
  const nextSecurity = { ...(current.security?.toObject?.() || current.security || {}), ...req.body };
  const changes = shallowDiff(current.security?.toObject?.() || current.security || {}, nextSecurity);
  const settings = await SystemSettings.findOneAndUpdate(
    {},
    { $set: { security: nextSecurity, updatedBy: req.user._id } },
    { new: true }
  );
  await auditFromReq(req, 'SETTINGS_UPDATED', `SystemSettings:${settings._id}`, { section: 'security', changes }, 'systemSettings').catch(() => {});
  res.json({ success: true, data: settings.security });
});

export const updateEmailSettings = asyncHandler(async (req, res) => {
  const current = await ensureSettings();
  const payload = { ...req.body };
  if (!Object.prototype.hasOwnProperty.call(payload, 'smtpPass')) {
    payload.smtpPass = current.email?.smtpPass || '';
  }
  const nextEmail = { ...(current.email?.toObject?.() || current.email || {}), ...payload };

  const settings = await SystemSettings.findOneAndUpdate(
    {},
    { $set: { email: nextEmail, updatedBy: req.user._id } },
    { new: true }
  );

  await auditFromReq(req, 'SETTINGS_UPDATED', `SystemSettings:${settings._id}`, { section: 'email' }, 'systemSettings').catch(() => {});
  invalidateSettingsCache();
  const masked = maskSmtpPass(settings);
  res.json({ success: true, data: masked.email });
});

export const updateEmailTemplate = asyncHandler(async (req, res) => {
  const { templateKey, subject, body } = req.body;
  if (!TEMPLATE_KEYS.has(templateKey)) throw AppError.badRequest('Invalid template key');

  const setObj = { updatedBy: req.user._id };
  if (typeof subject === 'string') setObj[`emailTemplates.${templateKey}.subject`] = subject;
  if (typeof body === 'string') setObj[`emailTemplates.${templateKey}.body`] = body;

  const settings = await SystemSettings.findOneAndUpdate({}, { $set: setObj }, { new: true, upsert: true });
  await auditFromReq(req, 'EMAIL_TEMPLATE_UPDATED', `SystemSettings:${settings._id}`, { template: templateKey }, 'systemSettings').catch(() => {});
  res.json({ success: true, data: settings.emailTemplates?.[templateKey] || {} });
});

export const sendTestEmail = asyncHandler(async (req, res) => {
  const settings = await ensureSettings();
  const emailConfig = settings.email || {};

  try {
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtpHost,
      port: emailConfig.smtpPort,
      secure: emailConfig.smtpEncryption === 'ssl',
      auth: { user: emailConfig.smtpUser, pass: emailConfig.smtpPass },
    });
    await transporter.verify();
    await transporter.sendMail({
      from: `${emailConfig.fromName} <${emailConfig.fromEmail}>`,
      to: req.user.email,
      subject: 'CareConnect 360 — Email Test',
      html: '<h2>Email configuration is working!</h2><p>This is a test email from CareConnect 360.</p>',
    });
  } catch (err) {
    throw AppError.badRequest(err.message || 'Unable to send test email');
  }

  res.json({ success: true, message: `Test email sent to ${req.user.email}` });
});

export const updateCronJobsSettings = asyncHandler(async (req, res) => {
  const current = await ensureSettings();
  const merged = { ...(current.cronJobs?.toObject?.() || current.cronJobs || {}) };
  ['appointmentReminder', 'patientReEngagement', 'prescriptionRenewal'].forEach((jobKey) => {
    if (req.body[jobKey]) merged[jobKey] = { ...merged[jobKey], ...req.body[jobKey] };
  });

  Object.values(merged).forEach((entry) => {
    if (entry?.schedule && !cron.validate(entry.schedule)) {
      throw AppError.badRequest(`Invalid cron schedule: ${entry.schedule}`);
    }
  });

  const settings = await SystemSettings.findOneAndUpdate(
    {},
    { $set: { cronJobs: merged, updatedBy: req.user._id } },
    { new: true, upsert: true }
  );

  applyCronSchedules(settings);
  await auditFromReq(req, 'CRON_SCHEDULE_UPDATED', `SystemSettings:${settings._id}`, { jobs: merged }, 'systemSettings').catch(() => {});
  res.json({ success: true, data: settings.cronJobs });
});

export const runCronJobNow = asyncHandler(async (req, res) => {
  const { jobName } = req.params;
  const runner = CRON_JOB_RUNNERS[jobName];
  if (!runner) throw AppError.badRequest('Invalid job name');

  await runner();
  await auditFromReq(req, 'CRON_JOB_MANUAL_TRIGGER', `SystemSettings:cron:${jobName}`, { jobName, triggeredBy: req.user.name }, 'systemSettings').catch(() => {});
  res.json({ success: true, message: 'Job completed successfully.' });
});

export const updateClinicSettings = asyncHandler(async (req, res) => {
  const payload = req.body || {};
  if (Array.isArray(payload.workingHours)) {
    payload.workingHours.forEach((h) => {
      if (h.isOpen && h.start >= h.end) throw AppError.badRequest(`${h.day}: End time must be after start time`);
    });
  }

  const current = await ensureSettings();
  const nextClinic = { ...(current.clinic?.toObject?.() || current.clinic || {}), ...payload };
  const settings = await SystemSettings.findOneAndUpdate(
    {},
    { $set: { clinic: nextClinic, updatedBy: req.user._id } },
    { new: true, upsert: true }
  );
  await auditFromReq(req, 'SETTINGS_UPDATED', `SystemSettings:${settings._id}`, { section: 'clinic' }, 'systemSettings').catch(() => {});
  res.json({ success: true, data: settings.clinic });
});

export const uploadClinicLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw AppError.badRequest('Logo file is required');
  const logoUrl = `/uploads/logos/${req.file.filename}`;
  await SystemSettings.findOneAndUpdate({}, { $set: { 'clinic.logoUrl': logoUrl, updatedBy: req.user._id } }, { upsert: true, new: true });
  res.json({ success: true, data: { logoUrl } });
});

export const updateAiServiceSettings = asyncHandler(async (req, res) => {
  const current = await ensureSettings();
  const nextAi = { ...(current.aiService?.toObject?.() || current.aiService || {}), ...req.body };
  const settings = await SystemSettings.findOneAndUpdate({}, { $set: { aiService: nextAi, updatedBy: req.user._id } }, { new: true, upsert: true });
  await auditFromReq(req, 'SETTINGS_UPDATED', `SystemSettings:${settings._id}`, { section: 'aiService' }, 'systemSettings').catch(() => {});
  res.json({ success: true, data: settings.aiService });
});

export const getAiServiceHealth = asyncHandler(async (_req, res) => {
  const settings = await ensureSettings();
  const url = `${settings.aiService?.url || 'http://localhost:8001'}/api/health`;
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const responseMs = Date.now() - start;
    const status = responseMs > 2000 ? 'slow' : (response.ok ? 'online' : 'error');
    return res.json({ success: true, data: { status, responseMs, url } });
  } catch {
    const responseMs = Date.now() - start;
    return res.json({ success: true, data: { status: 'error', responseMs, url } });
  } finally {
    clearTimeout(timeout);
  }
});

export const listMedicalTerms = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 100 });
  const regex = searchRegex(req.query.search);
  const query = regex ? { $or: [{ medicalTerm: regex }, { simplifiedTerm: regex }] } : {};

  const [rows, total] = await Promise.all([
    MedicalTerm.find(query).populate('addedBy', 'name').sort({ medicalTerm: 1 }).skip(skip).limit(limit).lean(),
    MedicalTerm.countDocuments(query),
  ]);
  res.json({ success: true, data: { terms: rows, pagination: paginationMeta(total, page, limit) } });
});

export const createMedicalTerm = asyncHandler(async (req, res) => {
  const medicalTerm = String(req.body.medicalTerm || '').trim();
  const simplifiedTerm = String(req.body.simplifiedTerm || '').trim();
  const duplicate = await MedicalTerm.findOne({ medicalTerm: new RegExp(`^${medicalTerm}$`, 'i') }).lean();
  if (duplicate) throw AppError.conflict('Medical term already exists');

  const row = await MedicalTerm.create({ medicalTerm, simplifiedTerm, addedBy: req.user._id });
  await auditFromReq(req, 'MEDICAL_TERM_ADDED', `MedicalTerm:${row._id}`, { medicalTerm, simplifiedTerm }, 'medicalTerms').catch(() => {});
  res.status(201).json({ success: true, data: row });
});

export const updateMedicalTerm = asyncHandler(async (req, res) => {
  const current = await MedicalTerm.findById(req.params.id);
  if (!current) throw AppError.notFound('Medical term not found');
  const medicalTerm = String(req.body.medicalTerm || current.medicalTerm).trim();
  const simplifiedTerm = String(req.body.simplifiedTerm || current.simplifiedTerm).trim();
  const duplicate = await MedicalTerm.findOne({
    _id: { $ne: current._id },
    medicalTerm: new RegExp(`^${medicalTerm}$`, 'i'),
  }).lean();
  if (duplicate) throw AppError.conflict('Medical term already exists');

  current.medicalTerm = medicalTerm;
  current.simplifiedTerm = simplifiedTerm;
  await current.save();
  await auditFromReq(req, 'MEDICAL_TERM_UPDATED', `MedicalTerm:${current._id}`, {}, 'medicalTerms').catch(() => {});
  res.json({ success: true, data: current });
});

export const deleteMedicalTerm = asyncHandler(async (req, res) => {
  const row = await MedicalTerm.findById(req.params.id);
  if (!row) throw AppError.notFound('Medical term not found');
  await MedicalTerm.deleteOne({ _id: row._id });
  await auditFromReq(req, 'MEDICAL_TERM_DELETED', `MedicalTerm:${row._id}`, { medicalTerm: row.medicalTerm }, 'medicalTerms').catch(() => {});
  res.json({ success: true, message: 'Medical term deleted' });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = await User.findById(req.user._id).select('+password');
  if (!admin) throw AppError.notFound('User not found');

  const isMatch = await bcrypt.compare(currentPassword, admin.password);
  if (!isMatch) throw AppError.badRequest('Current password is incorrect');

  const hashed = await bcrypt.hash(newPassword, 10);
  await User.updateOne({ _id: admin._id }, { $set: { password: hashed } });

  await auditFromReq(req, 'PASSWORD_CHANGED', `User:${req.user._id}`, { changedBy: 'self' }, 'users').catch(() => {});
  res.json({ success: true, message: 'Password changed successfully' });
});

export const getPublicSettings = asyncHandler(async (_req, res) => {
  const settings = await ensureSettings();
  const clinic = settings.clinic || {};
  res.json({
    success: true,
    data: {
      clinicName: clinic.name || 'CareConnect 360',
      tagline: clinic.tagline || '',
      phone: clinic.phone || '',
      email: clinic.email || '',
      logoUrl: clinic.logoUrl || '',
      currencySymbol: clinic.currencySymbol || 'Rs.',
    },
  });
});
