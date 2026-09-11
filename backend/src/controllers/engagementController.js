import EngagementLog from '../models/EngagementLog.js';
import SystemSettings from '../models/SystemSettings.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { dayBoundsInPakistan, toPakistanISODate, todayBoundsInPakistan } from '../utils/dateTime.js';
import { sendEngagementEmail, toEmailErrorMessage } from '../utils/emailService.js';
import { mailIsConfigured, resolveEngagementTemplate } from '../utils/engagementTemplates.js';
import { paginationMeta, parsePagination } from '../utils/query.js';

const RULE_MAP = {
  'ER-1': { type: 'appointment_reminder', templateKey: 'appointmentReminder', label: 'Appointment reminder' },
  'ER-2': { type: 'missed_appointment', templateKey: 'missedAppointment', label: 'Missed appointment' },
  'ER-3': { type: 'prescription_renewal', templateKey: 'prescriptionRenewal', label: 'Prescription renewal' },
  'ER-4': { type: 're_engagement', templateKey: 'reEngagement', label: 'Re-engagement' },
  'ER-5': { type: 'summary_available', templateKey: 'aiSummaryReady', label: 'AI summary availability' },
};

const JOB_KEY_TO_RULE = {
  appointmentReminder: 'ER-1',
  missedAppointmentDetector: 'ER-2',
  missedAppointment: 'ER-2',
  prescriptionRenewal: 'ER-3',
  patientReEngagement: 'ER-4',
  aiSummaryReady: 'ER-5',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const resolveRuleId = (raw) => {
  const key = String(raw || '').trim();
  if (RULE_MAP[key]) return key;
  return JOB_KEY_TO_RULE[key] || null;
};

export const getEngagementLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const query = {};

  if (req.query.ruleId) query.ruleId = req.query.ruleId;
  if (req.query.status) query.status = req.query.status;
  if (req.query.patientId) query.patientId = req.query.patientId;

  const [logs, total] = await Promise.all([
    EngagementLog.find(query)
      .populate('patientId', 'name patientId patientCode email')
      .sort({ triggeredAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    EngagementLog.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      logs,
      pagination: paginationMeta(total, page, limit),
    },
  });
});

export const getEngagementStats = asyncHandler(async (_req, res) => {
  const todayBounds = todayBoundsInPakistan();
  const monthStart = dayBoundsInPakistan(`${toPakistanISODate(new Date()).slice(0, 8)}01`)?.start;

  const [totalSentToday, failedToday, totalSentThisMonth, byRuleRows] = await Promise.all([
    EngagementLog.countDocuments({
      status: 'Sent',
      triggeredAt: { $gte: todayBounds?.start, $lte: todayBounds?.end },
    }),
    EngagementLog.countDocuments({
      status: 'Failed',
      triggeredAt: { $gte: todayBounds?.start, $lte: todayBounds?.end },
    }),
    EngagementLog.countDocuments({
      status: 'Sent',
      ...(monthStart ? { triggeredAt: { $gte: monthStart } } : {}),
    }),
    EngagementLog.aggregate([
      { $match: { status: 'Sent', ...(monthStart ? { triggeredAt: { $gte: monthStart } } : {}) } },
      { $group: { _id: '$ruleId', count: { $sum: 1 } } },
    ]),
  ]);

  const byRule = { 'ER-1': 0, 'ER-2': 0, 'ER-3': 0, 'ER-4': 0, 'ER-5': 0 };
  byRuleRows.forEach((row) => {
    if (byRule[row._id] !== undefined) byRule[row._id] = row.count;
  });

  res.json({
    success: true,
    data: {
      totalSentToday,
      totalSentThisMonth,
      failedToday,
      byRule,
    },
  });
});

export const sendEngagementTestEmail = asyncHandler(async (req, res) => {
  const ruleId = resolveRuleId(req.params.ruleId);
  const rule = ruleId ? RULE_MAP[ruleId] : null;
  if (!rule) {
    return res.status(400).json({ success: false, message: 'Invalid scheduled job' });
  }

  const settings = await SystemSettings.findOne({}).lean();
  if (!mailIsConfigured(settings)) {
    return res.status(400).json({ success: false, message: 'SMTP is not configured. Set host, user, and from email in Email settings.' });
  }

  const to = String(req.body?.testEmail || req.body?.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(to)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address' });
  }

  const template = resolveEngagementTemplate(settings, rule.templateKey);
  if (!template?.subject || !template?.body) {
    return res.status(400).json({ success: false, message: `${rule.templateKey} template not configured` });
  }

  const clinicName = settings?.clinic?.name || 'CareConnect 360';
  const portalBase = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const variables = {
    patientName: 'Test Patient',
    doctorName: 'Demo Doctor',
    specialization: 'General Medicine',
    date: toPakistanISODate(new Date()),
    time: '10:00 AM',
    clinicName,
    clinicPhone: settings?.clinic?.phone || '',
    clinicEmail: settings?.clinic?.email || '',
    renewalDate: toPakistanISODate(new Date()),
    medicationList: 'Paracetamol 500mg',
    lastVisitDate: toPakistanISODate(new Date()),
    reportTitle: 'Sample Lab Report',
    portalLink: `${portalBase}/patient/reports`,
    bookingLink: `${portalBase}/login`,
  };

  try {
    await sendEngagementEmail({
      to,
      subject: `[TEST] ${template.subject}`,
      bodyTemplate: template.body,
      variables,
      clinicName,
    });
  } catch (err) {
    throw AppError.badRequest(toEmailErrorMessage(err));
  }

  res.json({
    success: true,
    message: `Test ${rule.label} email sent to ${to}`,
    data: { to, ruleId, templateKey: rule.templateKey },
  });
});
