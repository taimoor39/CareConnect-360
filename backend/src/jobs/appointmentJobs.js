import cron from 'node-cron';
import mongoose from 'mongoose';

import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import DoctorProfile from '../models/DoctorProfile.js';
import EngagementLog from '../models/EngagementLog.js';
import Patient from '../models/Patient.js';
import Prescription from '../models/Prescription.js';
import { getSettings, sendEngagementEmail } from '../utils/emailService.js';
import { dayBoundsInPakistan, toPakistanISODate, todayBoundsInPakistan } from '../utils/dateTime.js';
import { logEngagement, wasAlreadySentToday } from '../utils/engagementHelper.js';
import auditLogger from '../utils/auditLogger.js';
import { pktNow } from '../utils/timezone.js';

const CLINIC_DEFAULT = 'CareConnect 360';

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

export const runAppointmentReminders = async () => {
  console.log('[CRON ER-1] Running appointment reminders...');
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const settings = await getSettings();
    if (!settings?.email?.smtpHost) {
      console.log('[CRON ER-1] Email not configured. Skipping.');
      return;
    }

    const template = settings.emailTemplates?.appointmentReminder;
    if (!template?.subject || !template?.body) {
      console.log('[CRON ER-1] Template not configured.');
      return;
    }

    // ER-1 should evaluate 24 hours ahead in PKT.
    const reminderTarget = pktNow().add(24, 'hour');
    const tomorrowBounds = dayBoundsInPakistan(reminderTarget.format('YYYY-MM-DD'));
    if (!tomorrowBounds) return;

    const appointments = await Appointment.find({
      date: { $gte: tomorrowBounds.start, $lte: tomorrowBounds.end },
      status: 'Scheduled',
    })
      .populate('patientId', 'name email phone patientId patientCode')
      .populate('doctorId', 'name')
      .lean();

    for (const appt of appointments) {
      try {
        const patient = appt.patientId;
        if (!patient?.email) {
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

        const clinicName = getClinicName(settings);
        const variables = {
          patientName: patient.name,
          doctorName: appt?.doctorId?.name || '',
          specialization: profile?.specialization || '',
          date: formatDate(appt.date),
          time: formatTimeSlot(appt.timeSlot),
          clinicName,
          patientCode: patient.patientId || patient.patientCode || '',
        };

        await sendEngagementEmail({
          to: patient.email,
          subject: template.subject,
          bodyTemplate: template.body,
          variables,
          clinicName,
        });

        await logEngagement({
          patientId: patient._id,
          ruleId: 'ER-1',
          type: 'appointment_reminder',
          message: `Reminder sent for appointment on ${formatDate(appt.date)}`,
          status: 'Sent',
          appointmentId: appt._id,
        });
        sent += 1;
      } catch (err) {
        failed += 1;
        await logEngagement({
          patientId: appt?.patientId?._id || null,
          ruleId: 'ER-1',
          type: 'appointment_reminder',
          message: 'Failed to send reminder',
          status: 'Failed',
          appointmentId: appt?._id || null,
          errorMessage: err.message,
        });
      }
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
};

export const runMissedAppointmentNotifications = async () => {
  console.log('[CRON ER-2] Running missed notifications...');
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const settings = await getSettings();
    if (!settings?.email?.smtpHost) return;

    const template = settings.emailTemplates?.missedAppointment;
    if (!template?.subject || !template?.body) return;

    const todayBounds = todayBoundsInPakistan();
    if (!todayBounds) return;

    const missedAppointments = await Appointment.find({
      status: 'Missed',
      date: { $gte: todayBounds.start, $lte: todayBounds.end },
    })
      .populate('patientId', 'name email patientId')
      .populate('doctorId', 'name')
      .lean();

    for (const appt of missedAppointments) {
      try {
        const patient = appt.patientId;
        if (!patient?.email) {
          skipped += 1;
          continue;
        }

        const alreadySent = await wasAlreadySentToday(patient._id, 'ER-2', appt._id);
        if (alreadySent) {
          skipped += 1;
          continue;
        }

        const clinicName = getClinicName(settings);
        const variables = {
          patientName: patient.name,
          doctorName: appt?.doctorId?.name || '',
          date: formatDate(appt.date),
          clinicName,
          clinicPhone: settings?.clinic?.phone || '',
          clinicEmail: settings?.clinic?.email || '',
        };

        await sendEngagementEmail({
          to: patient.email,
          subject: template.subject,
          bodyTemplate: template.body,
          variables,
          clinicName,
        });

        await logEngagement({
          patientId: patient._id,
          ruleId: 'ER-2',
          type: 'missed_appointment',
          message: `Missed appointment notification sent for ${formatDate(appt.date)}`,
          status: 'Sent',
          appointmentId: appt._id,
        });
        sent += 1;
      } catch (err) {
        failed += 1;
        await logEngagement({
          patientId: appt?.patientId?._id || null,
          ruleId: 'ER-2',
          type: 'missed_appointment',
          message: 'Failed to send missed notification',
          status: 'Failed',
          appointmentId: appt?._id || null,
          errorMessage: err.message,
        });
      }
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
};

export const runPrescriptionRenewals = async () => {
  console.log('[CRON ER-3] Checking prescription renewals...');
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const settings = await getSettings();
    if (!settings?.email?.smtpHost) return;

    const template = settings.emailTemplates?.prescriptionRenewal;
    if (!template?.subject || !template?.body) return;

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const renewalBounds = dayBoundsInPakistan(toPakistanISODate(sevenDaysFromNow));
    if (!renewalBounds) return;

    const consultations = await Consultation.find({
      followUpDate: { $gte: renewalBounds.start, $lte: renewalBounds.end },
    })
      .populate({ path: 'patientId', select: 'name email patientId' })
      .populate({ path: 'doctorId', select: 'name' })
      .lean();

    for (const consult of consultations) {
      try {
        const patient = consult.patientId;
        if (!patient?.email) {
          skipped += 1;
          continue;
        }

        const alreadySent = await wasAlreadySentToday(patient._id, 'ER-3');
        if (alreadySent) {
          skipped += 1;
          continue;
        }

        const rx = await Prescription.findOne({ consultationId: consult._id }).select('items').lean();
        const medicineList = rx?.items?.length
          ? rx.items.map((p) => `${p.medicineName} (${p.dosage})`).join(', ')
          : 'Your prescribed medicines';

        const clinicName = getClinicName(settings);
        const variables = {
          patientName: patient.name,
          doctorName: consult?.doctorId?.name || '',
          renewalDate: formatDate(consult.followUpDate),
          medicationList: medicineList,
          clinicName,
          clinicPhone: settings?.clinic?.phone || '',
        };

        await sendEngagementEmail({
          to: patient.email,
          subject: template.subject,
          bodyTemplate: template.body,
          variables,
          clinicName,
        });

        await logEngagement({
          patientId: patient._id,
          ruleId: 'ER-3',
          type: 'prescription_renewal',
          message: `Renewal alert sent for ${formatDate(consult.followUpDate)}`,
          status: 'Sent',
        });
        sent += 1;
      } catch (err) {
        failed += 1;
        await logEngagement({
          patientId: consult?.patientId?._id || null,
          ruleId: 'ER-3',
          type: 'prescription_renewal',
          message: 'Failed to send renewal alert',
          status: 'Failed',
          errorMessage: err.message,
        });
      }
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
};

export const runMissedDetector = async () => {
  console.log('[CRON] Running missed appointment check...');
  try {
    const todayBounds = todayBoundsInPakistan();
    const todayStart = todayBounds?.start || new Date();
    const todayEnd = todayBounds?.end || new Date();

    const result = await Appointment.updateMany(
      {
        status: 'Scheduled',
        date: { $gte: todayStart, $lte: todayEnd },
      },
      {
        $set: { status: 'Missed' },
      }
    );
    console.log(`[CRON] Marked ${result.modifiedCount} appointments as Missed`);

    const rawSystemId = process.env.SYSTEM_USER_ID || '';
    const systemUserId = mongoose.Types.ObjectId.isValid(rawSystemId) ? rawSystemId : null;
    await auditLogger({
      userId: systemUserId,
      action: 'CRON_MISSED_APPOINTMENTS',
      target: `Appointment:Batch:${toPakistanISODate(todayStart)}`,
      targetCollection: 'appointments',
      details: {
        modifiedCount: Number(result.modifiedCount || 0),
      },
    });
  } catch (err) {
    console.error('[CRON] Missed appointment job failed:', err);
  }
};

export const runPatientReEngagements = async () => {
  console.log('[CRON ER-4] Checking inactive patients...');
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const settings = await getSettings();
    if (!settings?.email?.smtpHost) return;

    const template = settings.emailTemplates?.reEngagement;
    if (!template?.subject || !template?.body) return;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const activePatients = await Patient.find({
      isArchived: false,
      status: { $in: ['Active', 'active'] },
      email: { $exists: true, $ne: '' },
    })
      .select('_id name email patientId createdAt')
      .lean();

    for (const patient of activePatients) {
      try {
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

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
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

        const clinicName = getClinicName(settings);
        const variables = {
          patientName: patient.name,
          lastVisitDate: formatDate(lastVisit),
          clinicName,
          clinicPhone: settings?.clinic?.phone || '',
          clinicEmail: settings?.clinic?.email || '',
        };

        await sendEngagementEmail({
          to: patient.email,
          subject: template.subject,
          bodyTemplate: template.body,
          variables,
          clinicName,
        });

        await logEngagement({
          patientId: patient._id,
          ruleId: 'ER-4',
          type: 're_engagement',
          message: `Re-engagement email sent. Last visit: ${formatDate(lastVisit)}`,
          status: 'Sent',
        });

        sent += 1;
      } catch (err) {
        failed += 1;
        await logEngagement({
          patientId: patient._id,
          ruleId: 'ER-4',
          type: 're_engagement',
          message: 'Failed to send re-engagement',
          status: 'Failed',
          errorMessage: err.message,
        });
      }
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
};

export const startCronJobs = (schedules = {}) => {
  const defaults = {
    appointmentReminder: '0 9 * * *',
    missedDetector: '59 23 * * *',
    missedNotification: '58 23 * * *',
    prescriptionRenewal: '0 8 * * *',
    reEngagement: '0 10 * * *',
  };

  global.cronTasks = global.cronTasks || {};
  Object.values(global.cronTasks).forEach((task) => {
    if (task?.destroy) task.destroy();
  });

  if (schedules.appointmentReminder !== false) {
    global.cronTasks.appointmentReminder = cron.schedule(
      schedules.appointmentReminder || defaults.appointmentReminder,
      () => { runAppointmentReminders().catch(() => {}); },
      { timezone: 'Asia/Karachi' }
    );
  }

  global.cronTasks.missedDetector = cron.schedule(
    defaults.missedDetector,
    () => { runMissedDetector().catch(() => {}); },
    { timezone: 'Asia/Karachi' }
  );

  global.cronTasks.missedNotification = cron.schedule(
    defaults.missedNotification,
    () => { runMissedAppointmentNotifications().catch(() => {}); },
    { timezone: 'Asia/Karachi' }
  );

  if (schedules.prescriptionRenewal !== false) {
    global.cronTasks.prescriptionRenewal = cron.schedule(
      schedules.prescriptionRenewal || defaults.prescriptionRenewal,
      () => { runPrescriptionRenewals().catch(() => {}); },
      { timezone: 'Asia/Karachi' }
    );
  }

  if (schedules.reEngagement !== false) {
    global.cronTasks.reEngagement = cron.schedule(
      schedules.reEngagement || defaults.reEngagement,
      () => { runPatientReEngagements().catch(() => {}); },
      { timezone: 'Asia/Karachi' }
    );
  }

  console.log('[CRON] All jobs scheduled');
};

export const registerAppointmentJobs = (schedules = {}) => {
  startCronJobs(schedules);
};
