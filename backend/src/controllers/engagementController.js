import EngagementLog from '../models/EngagementLog.js';
import SystemSettings from '../models/SystemSettings.js';
import asyncHandler from '../utils/asyncHandler.js';
import { dayBoundsInPakistan, toPakistanISODate, todayBoundsInPakistan } from '../utils/dateTime.js';
import { sendEngagementEmail } from '../utils/emailService.js';
import { paginationMeta, parsePagination } from '../utils/query.js';

const RULE_MAP = {
  'ER-1': { type: 'appointment_reminder', templateKey: 'appointmentReminder' },
  'ER-2': { type: 'missed_appointment', templateKey: 'missedAppointment' },
  'ER-3': { type: 'prescription_renewal', templateKey: 'prescriptionRenewal' },
  'ER-4': { type: 're_engagement', templateKey: 'reEngagement' },
  'ER-5': { type: 'summary_available', templateKey: 'aiSummaryReady' },
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
  const { ruleId } = req.params;
  const rule = RULE_MAP[ruleId];
  if (!rule) {
    return res.status(400).json({ success: false, message: 'Invalid ruleId' });
  }

  const settings = await SystemSettings.findOne({}).lean();
  if (!settings?.email?.smtpHost) {
    return res.status(400).json({ success: false, message: 'SMTP is not configured' });
  }

  const to = String(req.body?.testEmail || req.user?.email || '').trim();
  if (!to) {
    return res.status(400).json({ success: false, message: 'No test email available' });
  }

  const template = settings?.emailTemplates?.[rule.templateKey];
  if (!template?.subject || !template?.body) {
    return res.status(400).json({ success: false, message: `${rule.templateKey} template not configured` });
  }

  const clinicName = settings?.clinic?.name || 'CareConnect 360';
  const variables = {
    patientName: req.user?.name || 'Patient',
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
    portalLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/reports`,
  };

  await sendEngagementEmail({
    to,
    subject: template.subject,
    bodyTemplate: template.body,
    variables,
    clinicName,
  });

  res.json({ success: true, message: `Test ${ruleId} email sent to ${to}` });
});
