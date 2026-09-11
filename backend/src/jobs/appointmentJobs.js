/**
 * Scheduled engagement + housekeeping tasks (node-cron).
 *
 * Schedules are persisted on SystemSettings.cronJobs (see settings UI). Jobs include:
 *   ER-1  Appointment reminders (~24h ahead, PKT)
 *   ER-2  Missed appointment notices (after marking today's unattended slots)
 *   ER-3  Prescription renewal reminders
 *   ER-4  Re-engagement for inactive patients
 *   ER-5  AI summary availability (catch-up; also sent on doctor approve)
 */
import cron from 'node-cron';
import mongoose from 'mongoose';

import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import DoctorProfile from '../models/DoctorProfile.js';
import EngagementLog from '../models/EngagementLog.js';
import Patient from '../models/Patient.js';
import { getSettings, sendEngagementEmail } from '../utils/emailService.js';
import {
  mailIsConfigured,
  resolveEngagementTemplate,
  resolvePatientEmail,
} from '../utils/engagementTemplates.js';
import { dayBoundsInPakistan, toPakistanISODate, todayBoundsInPakistan } from '../utils/dateTime.js';
import { logEngagement, wasAlreadySentToday } from '../utils/engagementHelper.js';
import auditLogger from '../utils/auditLogger.js';
import { pktNow } from '../utils/timezone.js';

const CLINIC_DEFAULT = 'CareConnect 360';
const PATIENT_MAIL_SELECT = 'name email phone patientId patientCode contact';

const formatDate = (value) => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(dt);
};

const formatTimeSlot = (timeSlot) => String(timeSlot || '').trim();

const getClinicName = (settings) => settings?.clinic?.name || CLINIC_DEFAULT;

const clinicVars = (settings) => ({
  clinicName: getClinicName(settings),
  clinicPhone: settings?.clinic?.phone || '',
  clinicEmail: settings?.clinic?.email || '',
});

const slotHasPassed = (timeSlot, now) => {
  const start = String(timeSlot || '').split('-')[0]?.trim();
  if (!/^\d{1,2}:\d{2}$/.test(start)) {
    return now.hour() >= 23;
  }
  const [h, m] = start.split(':').map(Number);
  const slotMoment = now.startOf('day').hour(h).minute(m).second(0);
  return now.isAfter(slotMoment.add(20, 'minute'));
};

async function sendRuleEmail({
  settings,
  templateKey,
  patient,
  ruleId,
  type,
  message,
  appointmentId = null,
  extraVariables = {},
}) {
  const patientId = patient?._id;
  const to = resolvePatientEmail(patient);
  if (!patientId || !to) return 'skipped';

  const template = resolveEngagementTemplate(settings, templateKey);
  if (!template.subject || !template.body) return 'skipped';

  const clinicName = getClinicName(settings);
  const variables = {
    ...clinicVars(settings),
    patientName: patient.name || '',
    ...extraVariables,
  };

  try {
    await sendEngagementEmail({
      to,
      subject: template.subject,
      bodyTemplate: template.body,
      variables,
      clinicName,
    });
    const logged = await logEngagement({
      patientId,
      ruleId,
      type,
      message,
      status: 'Sent',
      appointmentId,
    });
    if (!logged) {
      console.error(`[CRON ${ruleId}] Email sent but Sent log was not saved for patient ${patientId}`);
    }
    return 'sent';
  } catch (err) {
    console.error(`[CRON ${ruleId}] Send failed:`, err.message);
    await logEngagement({
      patientId,
      ruleId,
      type,
      message,
      status: 'Failed',
      appointmentId,
      errorMessage: err.message,
    });
    return 'failed';
  }
}

const loadMailSettings = async (label) => {
  const settings = await getSettings();
  if (!mailIsConfigured(settings)) {
    console.log(`[${label}] SMTP is not fully configured (host, user, from email). Skipping send.`);
    return null;
  }
  return settings;
};

export const runAppointmentReminders = async () => {
  console.log('[CRON ER-1] Running appointment reminders...');
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const settings = await loadMailSettings('CRON ER-1');
    if (!settings) return { sent, skipped, failed, reason: 'smtp' };

    const reminderTarget = pktNow().add(24, 'hour');
    const tomorrowBounds = dayBoundsInPakistan(reminderTarget.format('YYYY-MM-DD'));
    if (!tomorrowBounds) return { sent, skipped, failed };

    const appointments = await Appointment.find({
      date: { $gte: tomorrowBounds.start, $lte: tomorrowBounds.end },
      status: 'Scheduled',
    })
      .populate('patientId', PATIENT_MAIL_SELECT)
      .populate('doctorId', 'name')
      .lean();

    console.log(`[CRON ER-1] Found ${appointments.length} scheduled appointment(s) for ${tomorrowBounds.isoDate}`);

    for (const appt of appointments) {
      const patient = appt.patientId;
      if (!resolvePatientEmail(patient)) {
        skipped += 1;
        continue;
      }

      const alreadySent = await wasAlreadySentToday(patient._id, 'ER-1', appt._id);
      if (alreadySent) {
        skipped += 1;
        continue;
      }

      const profile = await DoctorProfile.findOne({ userId: appt?.doctorId?._id })
        .select('specialization')
        .lean();

      const result = await sendRuleEmail({
        settings,
        templateKey: 'appointmentReminder',
        patient,
        ruleId: 'ER-1',
        type: 'appointment_reminder',
        message: `Reminder sent for appointment on ${formatDate(appt.date)}`,
        appointmentId: appt._id,
        extraVariables: {
          doctorName: appt?.doctorId?.name || '',
          specialization: profile?.specialization || '',
          date: formatDate(appt.date),
          time: formatTimeSlot(appt.timeSlot),
          patientCode: patient.patientId || patient.patientCode || '',
        },
      });
      if (result === 'sent') sent += 1;
      else if (result === 'failed') failed += 1;
      else skipped += 1;
    }

    await auditLogger({
      userId: null,
      action: 'CRON_APPOINTMENT_REMINDERS',
      target: `Appointment:Reminder:${toPakistanISODate(new Date())}`,
      targetCollection: 'appointments',
      details: { sent, skipped, failed },
    });
    console.log(`[CRON ER-1] Done. Sent:${sent} Skipped:${skipped} Failed:${failed}`);
  } catch (err) {
    console.error('[CRON ER-1] Fatal error:', err.message);
  }
  return { sent, skipped, failed };
};

export const runMissedAppointmentNotifications = async () => {
  console.log('[CRON ER-2] Running missed notifications...');
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const settings = await loadMailSettings('CRON ER-2');
    if (!settings) return { sent, skipped, failed, reason: 'smtp' };

    const todayBounds = todayBoundsInPakistan();
    if (!todayBounds) return { sent, skipped, failed };

    const missedAppointments = await Appointment.find({
      status: 'Missed',
      date: { $gte: todayBounds.start, $lte: todayBounds.end },
    })
      .populate('patientId', PATIENT_MAIL_SELECT)
      .populate('doctorId', 'name')
      .lean();

    console.log(`[CRON ER-2] Found ${missedAppointments.length} missed appointment(s)`);

    for (const appt of missedAppointments) {
      const patient = appt.patientId;
      if (!resolvePatientEmail(patient)) {
        skipped += 1;
        continue;
      }

      const alreadySent = await wasAlreadySentToday(patient._id, 'ER-2', appt._id);
      if (alreadySent) {
        skipped += 1;
        continue;
      }

      const result = await sendRuleEmail({
        settings,
        templateKey: 'missedAppointment',
        patient,
        ruleId: 'ER-2',
        type: 'missed_appointment',
        message: `Missed appointment notification sent for ${formatDate(appt.date)}`,
        appointmentId: appt._id,
        extraVariables: {
          doctorName: appt?.doctorId?.name || '',
          date: formatDate(appt.date),
        },
      });
      if (result === 'sent') sent += 1;
      else if (result === 'failed') failed += 1;
      else skipped += 1;
    }

    await auditLogger({
      userId: null,
      action: 'CRON_MISSED_APPOINTMENT_NOTIFICATIONS',
      target: `Appointment:MissedNotification:${toPakistanISODate(new Date())}`,
      targetCollection: 'appointments',
      details: { sent, skipped, failed },
    });
    console.log(`[CRON ER-2] Done. Sent:${sent} Skipped:${skipped} Failed:${failed}`);
  } catch (err) {
    console.error('[CRON ER-2] Fatal error:', err.message);
  }
  return { sent, skipped, failed };
};

export const runPrescriptionRenewals = async () => {
  console.log('[CRON ER-3] Checking prescription renewals...');
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const settings = await loadMailSettings('CRON ER-3');
    if (!settings) return { sent, skipped, failed, reason: 'smtp' };

    const renewalIso = pktNow().add(7, 'day').format('YYYY-MM-DD');
    const renewalBounds = dayBoundsInPakistan(renewalIso);
    if (!renewalBounds) return { sent, skipped, failed };

    const consultations = await Consultation.find({
      followUpDate: { $gte: renewalBounds.start, $lte: renewalBounds.end },
      isDraft: { $ne: true },
    })
      .populate({ path: 'patientId', select: PATIENT_MAIL_SELECT })
      .populate({ path: 'doctorId', select: 'name' })
      .lean();

    console.log(`[CRON ER-3] Found ${consultations.length} follow-up(s) on ${renewalIso}`);

    for (const consult of consultations) {
      const patient = consult.patientId;
      if (!resolvePatientEmail(patient)) {
        skipped += 1;
        continue;
      }

      const alreadySent = await wasAlreadySentToday(patient._id, 'ER-3', consult.appointmentId);
      if (alreadySent) {
        skipped += 1;
        continue;
      }

      const medicineList = consult.prescription?.items?.length
        ? consult.prescription.items.map((p) => `${p.medicineName} (${p.dosage})`).join(', ')
        : 'Your prescribed medicines';

      const result = await sendRuleEmail({
        settings,
        templateKey: 'prescriptionRenewal',
        patient,
        ruleId: 'ER-3',
        type: 'prescription_renewal',
        message: `Renewal alert sent for ${formatDate(consult.followUpDate)}`,
        appointmentId: consult.appointmentId || null,
        extraVariables: {
          doctorName: consult?.doctorId?.name || '',
          renewalDate: formatDate(consult.followUpDate),
          medicationList: medicineList,
        },
      });
      if (result === 'sent') sent += 1;
      else if (result === 'failed') failed += 1;
      else skipped += 1;
    }

    await auditLogger({
      userId: null,
      action: 'CRON_PRESCRIPTION_RENEWALS',
      target: `Consultation:PrescriptionRenewal:${toPakistanISODate(new Date())}`,
      targetCollection: 'consultations',
      details: { sent, skipped, failed },
    });
    console.log(`[CRON ER-3] Done. Sent:${sent} Skipped:${skipped} Failed:${failed}`);
  } catch (err) {
    console.error('[CRON ER-3] Fatal error:', err.message);
  }
  return { sent, skipped, failed };
};

export const runMissedDetector = async () => {
  console.log('[CRON] Running missed appointment check...');
  try {
    const todayBounds = todayBoundsInPakistan();
    const todayStart = todayBounds?.start || new Date();
    const todayEnd = todayBounds?.end || new Date();
    const now = pktNow();

    const scheduledToday = await Appointment.find({
      status: 'Scheduled',
      date: { $gte: todayStart, $lte: todayEnd },
    }).select('_id timeSlot').lean();

    const dueIds = scheduledToday
      .filter((appt) => slotHasPassed(appt.timeSlot, now))
      .map((appt) => appt._id);

    let modifiedCount = 0;
    if (dueIds.length) {
      const result = await Appointment.updateMany(
        { _id: { $in: dueIds }, status: 'Scheduled' },
        { $set: { status: 'Missed' } },
      );
      modifiedCount = Number(result.modifiedCount || 0);
    }

    console.log(`[CRON] Marked ${modifiedCount} appointments as Missed`);

    const rawSystemId = process.env.SYSTEM_USER_ID || '';
    const systemUserId = mongoose.Types.ObjectId.isValid(rawSystemId) ? rawSystemId : null;
    await auditLogger({
      userId: systemUserId,
      action: 'CRON_MISSED_APPOINTMENTS',
      target: `Appointment:Batch:${toPakistanISODate(todayStart)}`,
      targetCollection: 'appointments',
      details: { modifiedCount },
    });
    return { modifiedCount };
  } catch (err) {
    console.error('[CRON] Missed appointment job failed:', err);
    return { modifiedCount: 0 };
  }
};

/** Mark today's unattended slots as Missed, then email those patients. */
export const runMissedAppointmentWorkflow = async () => {
  const marked = await runMissedDetector();
  const mailed = await runMissedAppointmentNotifications();
  return { ...marked, ...mailed };
};

export const runPatientReEngagements = async () => {
  console.log('[CRON ER-4] Checking inactive patients...');
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const settings = await loadMailSettings('CRON ER-4');
    if (!settings) return { sent, skipped, failed, reason: 'smtp' };

    const sixMonthsAgo = pktNow().subtract(6, 'month').toDate();

    const activePatients = await Patient.find({
      isArchived: false,
      status: { $in: ['Active', 'active'] },
    })
      .select('_id name email patientId createdAt contact')
      .lean();

    console.log(`[CRON ER-4] Scanning ${activePatients.length} active patient(s)`);

    for (const patient of activePatients) {
      if (!resolvePatientEmail(patient)) {
        skipped += 1;
        continue;
      }

      const lastAppt = await Appointment.findOne({
        patientId: patient._id,
        status: 'Completed',
      })
        .sort({ date: -1 })
        .select('date')
        .lean();

      const lastVisit = lastAppt?.date || null;
      if (!lastVisit) {
        skipped += 1;
        continue;
      }

      if (new Date(lastVisit) > sixMonthsAgo) {
        skipped += 1;
        continue;
      }

      const oneWeekAgo = pktNow().subtract(7, 'day').toDate();
      const recentlySent = await EngagementLog.findOne({
        patientId: patient._id,
        ruleId: 'ER-4',
        status: 'Sent',
        triggeredAt: { $gte: oneWeekAgo },
      }).lean();
      if (recentlySent) {
        skipped += 1;
        continue;
      }

      const result = await sendRuleEmail({
        settings,
        templateKey: 'reEngagement',
        patient,
        ruleId: 'ER-4',
        type: 're_engagement',
        message: `Re-engagement email sent. Last visit: ${formatDate(lastVisit)}`,
        extraVariables: {
          lastVisitDate: formatDate(lastVisit),
        },
      });
      if (result === 'sent') sent += 1;
      else if (result === 'failed') failed += 1;
      else skipped += 1;
    }

    await auditLogger({
      userId: null,
      action: 'CRON_PATIENT_REENGAGEMENT',
      target: `Patient:ReEngagement:${toPakistanISODate(new Date())}`,
      targetCollection: 'patients',
      details: { sent, skipped, failed },
    });
    console.log(`[CRON ER-4] Done. Sent:${sent} Skipped:${skipped} Failed:${failed}`);
  } catch (err) {
    console.error('[CRON ER-4] Fatal error:', err.message);
  }
  return { sent, skipped, failed };
};

export const runAiSummaryAvailability = async () => {
  console.log('[CRON ER-5] Checking approved AI summaries...');
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const settings = await loadMailSettings('CRON ER-5');
    if (!settings) return { sent, skipped, failed, reason: 'smtp' };

    const since = pktNow().subtract(2, 'day').toDate();
    const consultations = await Consultation.find({
      'medicalReport.summary.status': 'Approved',
      'medicalReport.summary.approvedAt': { $gte: since },
    })
      .populate({ path: 'patientId', select: PATIENT_MAIL_SELECT })
      .lean();

    console.log(`[CRON ER-5] Found ${consultations.length} recently approved summary(s)`);

    const portalLink = `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/patient/reports`;

    for (const consult of consultations) {
      const patient = consult.patientId;
      if (!resolvePatientEmail(patient)) {
        skipped += 1;
        continue;
      }

      const alreadySent = await wasAlreadySentToday(patient._id, 'ER-5', consult.appointmentId);
      if (alreadySent) {
        skipped += 1;
        continue;
      }

      const reportTitle = consult.medicalReport?.title || 'Medical Report';
      const result = await sendRuleEmail({
        settings,
        templateKey: 'aiSummaryReady',
        patient,
        ruleId: 'ER-5',
        type: 'summary_available',
        message: `Summary ready notification sent for report: ${reportTitle}`,
        appointmentId: consult.appointmentId || null,
        extraVariables: {
          reportTitle,
          portalLink,
        },
      });
      if (result === 'sent') sent += 1;
      else if (result === 'failed') failed += 1;
      else skipped += 1;
    }

    await auditLogger({
      userId: null,
      action: 'CRON_AI_SUMMARY_AVAILABILITY',
      target: `Consultation:AiSummary:${toPakistanISODate(new Date())}`,
      targetCollection: 'consultations',
      details: { sent, skipped, failed },
    });
    console.log(`[CRON ER-5] Done. Sent:${sent} Skipped:${skipped} Failed:${failed}`);
  } catch (err) {
    console.error('[CRON ER-5] Fatal error:', err.message);
  }
  return { sent, skipped, failed };
};

const stopTask = (task) => {
  try {
    if (typeof task?.stop === 'function') task.stop();
    if (typeof task?.destroy === 'function') task.destroy();
  } catch {
    /* already stopped */
  }
};

const scheduleJob = (name, expression, handler) => {
  const expr = String(expression || '').trim();
  const valid = typeof cron.validate === 'function' ? cron.validate(expr) : Boolean(expr);
  if (!expr || !valid) {
    console.error(`[CRON] Invalid schedule for ${name}:`, expression);
    return;
  }
  const task = cron.schedule(
    expr,
    () => {
      handler().catch((err) => console.error(`[CRON] ${name} failed:`, err?.message || err));
    },
    { timezone: 'Asia/Karachi' },
  );
  if (typeof task?.start === 'function') task.start();
  global.cronTasks[name] = task;
  console.log(`[CRON] ${name} → ${expr} (Asia/Karachi)`);
};

export const startCronJobs = (schedules = {}) => {
  const defaults = {
    appointmentReminder: '0 9 * * *',
    missedWorkflow: '59 23 * * *',
    prescriptionRenewal: '0 8 * * *',
    reEngagement: '0 10 * * *',
    aiSummaryReady: '10 * * * *',
  };

  global.cronTasks = global.cronTasks || {};
  Object.values(global.cronTasks).forEach(stopTask);
  global.cronTasks = {};

  if (schedules.appointmentReminder !== false) {
    scheduleJob(
      'appointmentReminder',
      schedules.appointmentReminder || defaults.appointmentReminder,
      runAppointmentReminders,
    );
  }

  scheduleJob('missedWorkflow', defaults.missedWorkflow, runMissedAppointmentWorkflow);

  if (schedules.prescriptionRenewal !== false) {
    scheduleJob(
      'prescriptionRenewal',
      schedules.prescriptionRenewal || defaults.prescriptionRenewal,
      runPrescriptionRenewals,
    );
  }

  if (schedules.reEngagement !== false) {
    scheduleJob(
      'reEngagement',
      schedules.reEngagement || defaults.reEngagement,
      runPatientReEngagements,
    );
  }

  scheduleJob('aiSummaryReady', defaults.aiSummaryReady, runAiSummaryAvailability);

  console.log('[CRON] All jobs scheduled');
};
