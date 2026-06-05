/**
 * Doctor portal API (/api/doctor/*) — scoped by JWT to the logged-in doctor.
 *
 * Consultation document embeds notes, prescription items, and medical report (+ AI summary).
 */
import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import DoctorProfile from '../models/DoctorProfile.js';
import Patient from '../models/Patient.js';
import SystemSettings from '../models/SystemSettings.js';
import User from '../models/User.js';
import auditLogger from '../utils/auditLogger.js';
import { notifyAdmins } from '../realtime/adminRealtime.js';
import { getSettings, sendEngagementEmail } from '../utils/emailService.js';
import { logEngagement, wasAlreadySentToday } from '../utils/engagementHelper.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  resolveIsDraftForSave,
  toConsultationBundle,
  toDoctorReportRow,
  toPrescriptionRow,
} from '../utils/consultationHelpers.js';
import { dayBoundsInPakistan, todayBoundsInPakistan, toPakistanISODate } from '../utils/dateTime.js';
import { paginationMeta, parsePagination, searchRegex } from '../utils/query.js';
import { getMedicalTermsMapForAI } from '../utils/medicalTermsForAI.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

const sendSummaryReadyNotification = async (patient, reportTitle, settings) => {
  try {
    if (!settings?.email?.smtpHost) return;
    if (!patient?.email) return;

    const template = settings.emailTemplates?.aiSummaryReady;
    if (!template?.subject || !template?.body) return;

    const alreadySent = await wasAlreadySentToday(patient._id, 'ER-5');
    if (alreadySent) return;

    const clinicName = settings?.clinic?.name || 'CareConnect 360';
    const variables = {
      patientName: patient.name,
      reportTitle: reportTitle || 'Medical Report',
      clinicName,
      portalLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/patient/reports`,
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
      ruleId: 'ER-5',
      type: 'summary_available',
      message: `Summary ready notification sent for report: ${reportTitle || 'Untitled'}`,
      status: 'Sent',
    });
  } catch (err) {
    await logEngagement({
      patientId: patient?._id || null,
      ruleId: 'ER-5',
      type: 'summary_available',
      message: 'Failed to send summary notification',
      status: 'Failed',
      errorMessage: err.message,
    });
  }
};

const ensureDoctorOwnsAppointment = async (doctorId, appointmentId) => {
  const appointment = await Appointment.findOne({ _id: appointmentId, doctorId });
  if (!appointment) throw AppError.forbidden('You can only access your own appointments');
  return appointment;
};

const findConsultationByAppointment = (doctorId, appointmentId) =>
  Consultation.findOne({ appointmentId, doctorId });

const ensureConsultationForAppointment = async (doctorId, appointment, seed = {}) => {
  let consultation = await findConsultationByAppointment(doctorId, appointment._id);
  if (!consultation) {
    consultation = await Consultation.create({
      appointmentId: appointment._id,
      doctorId,
      patientId: appointment.patientId,
      isDraft: true,
      ...seed,
    });
  }
  return consultation;
};

const maybeCompleteAppointment = async (appointment, isDraft) => {
  if (isDraft !== false || !appointment) return;
  if (appointment.status === 'Checked-In') appointment.status = 'In-Progress';
  else if (appointment.status === 'In-Progress') appointment.status = 'Completed';
  await appointment.save();
  notifyAdmins({ scopes: ['dashboard'], reason: 'consultation_completed' });
};

const applyConsultationFields = (consultation, body) => {
  ['symptoms', 'diagnosis', 'consultationNotes', 'followUpDate', 'isDraft'].forEach((k) => {
    if (body[k] !== undefined) consultation[k] = body[k];
  });
  if (body.prescription?.items) {
    consultation.prescription = { items: body.prescription.items };
    consultation.markModified('prescription');
  }
  if (body.medicalReport?.title) {
    const existing = consultation.medicalReport?.toObject?.() || consultation.medicalReport || {};
    const incoming = body.medicalReport;
    const fileType = incoming.fileType === 'pdf' || existing.fileType === 'pdf' ? 'pdf' : 'text';
    const originalText =
      fileType === 'pdf'
        ? String(existing.originalText || '')
        : String(incoming.originalText || existing.originalText || '').trim();

    consultation.set('medicalReport', {
      title: String(incoming.title || existing.title || '').trim(),
      fileType,
      originalText,
      pdfName: incoming.pdfName || existing.pdfName || '',
      pdfMimeType: incoming.pdfMimeType || existing.pdfMimeType || '',
      pdfSizeBytes: incoming.pdfSizeBytes || existing.pdfSizeBytes || 0,
      pdfBase64: incoming.pdfBase64 || existing.pdfBase64 || '',
      uploadedAt: existing.uploadedAt || new Date(),
      summary:
        existing.summary?.status && existing.summary.status !== 'Not Generated'
          ? existing.summary
          : { status: 'Not Generated' },
    });
    consultation.markModified('medicalReport');
  }
};

const applyPdfMedicalReport = (consultation, file, title) => {
  if (!file) return;
  consultation.set('medicalReport', {
    title: String(title || consultation.medicalReport?.title || 'Medical Report').trim(),
    fileType: 'pdf',
    originalText: '',
    pdfName: file.originalname || '',
    pdfMimeType: file.mimetype || '',
    pdfSizeBytes: file.size || 0,
    pdfBase64: file.buffer.toString('base64'),
    uploadedAt: new Date(),
    summary: { status: 'Not Generated' },
  });
  consultation.markModified('medicalReport');
};

const followUpIsoDate = (value) => {
  if (value === null || value === undefined || value === '') return '';
  return String(value).slice(0, 10);
};

const assertFollowUpChangedIsFuture = (consultation, incomingFollowUpDate) => {
  const incoming = followUpIsoDate(incomingFollowUpDate);
  if (!incoming) return;
  const existing = consultation.followUpDate
    ? toPakistanISODate(new Date(consultation.followUpDate))
    : '';
  if (incoming === existing) return;
  if (incoming <= toPakistanISODate(new Date())) {
    throw AppError.badRequest('Follow-up date must be in the future');
  }
};

export const getDoctorDashboardStats = asyncHandler(async (req, res) => {
  const doctorId = req.user._id;
  const now = new Date();
  const todayBounds = todayBoundsInPakistan();
  const todayStart = todayBounds?.start || new Date();
  const todayEnd = todayBounds?.end || new Date();
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const [todayCount, weekCount, upcomingCount, doctorAppointments, pendingSummaries] = await Promise.all([
    Appointment.countDocuments({ doctorId, date: { $gte: todayStart, $lte: todayEnd } }),
    Appointment.countDocuments({ doctorId, date: { $gte: weekStart, $lte: weekEnd } }),
    Appointment.countDocuments({ doctorId, date: { $gt: now }, status: { $in: ['Scheduled', 'Checked-In', 'In-Progress'] } }),
    Appointment.find({ doctorId }).select('patientId').lean(),
    Consultation.countDocuments({
      doctorId,
      'medicalReport.title': { $nin: [null, ''] },
      'medicalReport.summary.status': 'Pending Approval',
    }),
  ]);

  const totalPatients = new Set(doctorAppointments.map((a) => String(a.patientId))).size;
  res.json({ success: true, data: { todayCount, weekCount, pendingSummaries, totalPatients, upcomingCount } });
});

export const getDoctorSchedule = asyncHandler(async (req, res) => {
  const query = { doctorId: req.user._id };
  if (req.query.status) query.status = req.query.status;
  if (req.query.from || req.query.to) {
    query.date = {};
    if (req.query.from) query.date.$gte = dayBoundsInPakistan(req.query.from)?.start;
    if (req.query.to) query.date.$lte = dayBoundsInPakistan(req.query.to)?.end;
  }

  const rows = await Appointment.find(query)
    .populate('patientId', 'name patientId patientCode phone email gender')
    .sort({ date: 1, timeSlot: 1 });

  res.json({ success: true, data: rows });
});

export const getDoctorPatients = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const appts = await Appointment.find({ doctorId: req.user._id }).select('patientId').lean();
  const patientIds = [...new Set(appts.map((a) => String(a.patientId)))];
  const query = { _id: { $in: patientIds }, isArchived: false };
  if (req.query.status && req.query.status !== 'All') query.status = req.query.status;
  const regex = searchRegex(req.query.search);
  if (regex) {
    query.$or = [{ name: regex }, { phone: regex }, { patientId: regex }, { patientCode: regex }, { email: regex }];
  }

  const [patients, total] = await Promise.all([
    Patient.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Patient.countDocuments(query),
  ]);

  res.json({ success: true, data: { patients, pagination: paginationMeta(total, page, limit) } });
});

export const getDoctorPatientDetail = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.patientId).lean();
  if (!patient) throw AppError.notFound('Patient not found');

  const [visitHistory, consultations] = await Promise.all([
    Appointment.find({ doctorId: req.user._id, patientId: req.params.patientId }).sort({ date: -1, timeSlot: -1 }).lean(),
    Consultation.find({ doctorId: req.user._id, patientId: req.params.patientId })
      .populate('appointmentId', 'date timeSlot status')
      .sort({ updatedAt: -1 })
      .lean(),
  ]);

  const reports = consultations
    .filter((c) => c.medicalReport?.title)
    .map((c) => toDoctorReportRow(c, patient));
  const prescriptions = consultations
    .filter((c) => c.prescription?.items?.length)
    .map((c) => toPrescriptionRow(c, { patient, appointment: c.appointmentId }));

  // Enrich visit history rows with consultation fields saved on consultation docs.
  const consultationByAppointmentId = new Map(
    consultations
      .filter((c) => c?.appointmentId?._id)
      .map((c) => [String(c.appointmentId._id), c]),
  );
  const enrichedVisitHistory = visitHistory.map((visit) => {
    const linkedConsultation = consultationByAppointmentId.get(String(visit._id));
    return {
      ...visit,
      consultationNotes: linkedConsultation?.consultationNotes || '',
      symptoms: linkedConsultation?.symptoms || '',
      diagnosis: linkedConsultation?.diagnosis || '',
    };
  });

  res.json({ success: true, data: { patient, visitHistory: enrichedVisitHistory, reports, prescriptions } });
});

export const getDoctorConsultations = asyncHandler(async (req, res) => {
  const rows = await Consultation.find({ doctorId: req.user._id })
    .populate('appointmentId')
    .populate('patientId', 'name patientId patientCode')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: rows });
});

/** GET /api/doctor/appointments/:appointmentId/consultation */
export const getAppointmentConsultationBundle = asyncHandler(async (req, res) => {
  await ensureDoctorOwnsAppointment(req.user._id, req.params.appointmentId);
  const consultation = await findConsultationByAppointment(req.user._id, req.params.appointmentId).lean();
  res.json({ success: true, data: toConsultationBundle(consultation) });
});

/** PUT /api/doctor/appointments/:appointmentId/consultation — notes + prescription + medical report */
export const upsertConsultationByAppointment = asyncHandler(async (req, res) => {
  const appointment = await ensureDoctorOwnsAppointment(req.user._id, req.params.appointmentId);
  const body = req.parsedConsultationBody || req.body;
  const isDraft = body.isDraft !== undefined ? Boolean(body.isDraft) : undefined;

  let consultation = await findConsultationByAppointment(req.user._id, appointment._id);
  if (!consultation) {
    consultation = new Consultation({
      appointmentId: appointment._id,
      doctorId: req.user._id,
      patientId: appointment.patientId,
      isDraft: isDraft !== undefined ? isDraft : true,
    });
  }

  if (body.followUpDate !== undefined) {
    assertFollowUpChangedIsFuture(consultation, body.followUpDate);
  }

  if (req.file) {
    if (String(req.file.mimetype || '').toLowerCase() !== 'application/pdf') {
      throw AppError.badRequest('Only PDF files are accepted');
    }
    if (req.file.size > 10 * 1024 * 1024) {
      throw AppError.badRequest('File too large (max 10MB)');
    }
    applyPdfMedicalReport(consultation, req.file, body.medicalReport?.title);
  }

  applyConsultationFields(consultation, body);
  consultation.isDraft = resolveIsDraftForSave(isDraft, appointment.status, consultation);
  await consultation.save();

  if (consultation.isDraft === false) {
    await maybeCompleteAppointment(appointment, false);
  }

  const saved = await Consultation.findById(consultation._id).lean();
  res.json({ success: true, data: toConsultationBundle(saved) });
});

export const createConsultation = asyncHandler(async (req, res) => {
  const appointment = await ensureDoctorOwnsAppointment(req.user._id, req.body.appointmentId);
  const bodyIsDraft = req.body.isDraft !== undefined ? Boolean(req.body.isDraft) : undefined;

  let consultation = await findConsultationByAppointment(req.user._id, appointment._id);
  const isNewRecord = !consultation;
  if (!consultation) {
    consultation = new Consultation({
      appointmentId: appointment._id,
      doctorId: req.user._id,
      patientId: appointment.patientId,
      isDraft: bodyIsDraft !== undefined ? bodyIsDraft : true,
    });
  }

  applyConsultationFields(consultation, req.body);
  consultation.isDraft = resolveIsDraftForSave(bodyIsDraft, appointment.status, consultation);
  await consultation.save();

  if (consultation.isDraft === false) {
    await maybeCompleteAppointment(appointment, false);
  }

  res.status(isNewRecord ? 201 : 200).json({ success: true, data: toConsultationBundle(consultation) });
});

export const updateConsultation = asyncHandler(async (req, res) => {
  const consultation = await Consultation.findOne({ _id: req.params.id, doctorId: req.user._id });
  if (!consultation) throw AppError.notFound('Consultation not found');

  applyConsultationFields(consultation, req.body);

  const appointment = await Appointment.findOne({ _id: consultation.appointmentId, doctorId: req.user._id });
  const bodyIsDraft = req.body.isDraft !== undefined ? Boolean(req.body.isDraft) : undefined;
  consultation.isDraft = resolveIsDraftForSave(bodyIsDraft, appointment?.status, consultation);
  await consultation.save();

  if (consultation.isDraft === false) {
    await maybeCompleteAppointment(appointment, false);
  }

  res.json({ success: true, data: toConsultationBundle(consultation) });
});

/** POST /api/doctor/prescriptions — saves items on the consultation document */
export const saveConsultationPrescription = asyncHandler(async (req, res) => {
  const consultation = await Consultation.findOne({ _id: req.body.consultationId, doctorId: req.user._id });
  if (!consultation) throw AppError.forbidden('Consultation not found for this doctor');
  if (String(consultation.patientId) !== String(req.body.patientId)) {
    throw AppError.badRequest('Patient does not match consultation');
  }

  consultation.prescription = { items: req.body.items };
  consultation.markModified('prescription');

  const appointment = await Appointment.findById(consultation.appointmentId).select('status').lean();
  if (appointment?.status === 'Completed') {
    consultation.isDraft = false;
  }

  await consultation.save();

  res.json({
    success: true,
    data: toPrescriptionRow(consultation),
  });
});

export const getDoctorPrescriptions = asyncHandler(async (req, res) => {
  const rows = await Consultation.find({
    doctorId: req.user._id,
    'prescription.items.0': { $exists: true },
  })
    .populate('patientId', 'name patientId patientCode')
    .populate('appointmentId', 'date timeSlot status')
    .sort({ updatedAt: -1 })
    .lean();

  res.json({
    success: true,
    data: rows.map((c) => toPrescriptionRow(c)),
  });
});

export const getDoctorReports = asyncHandler(async (req, res) => {
  const query = {
    doctorId: req.user._id,
    'medicalReport.title': { $nin: [null, ''] },
  };
  if (req.query.patientId) query.patientId = req.query.patientId;

  const rows = await Consultation.find(query)
    .populate('patientId', 'name patientId patientCode')
    .sort({ 'medicalReport.uploadedAt': -1, updatedAt: -1 })
    .lean();

  res.json({ success: true, data: rows.map((c) => toDoctorReportRow(c)) });
});

/** POST /api/doctor/appointments/:appointmentId/consultation/medical-report */
export const uploadConsultationMedicalReport = asyncHandler(async (req, res) => {
  const file = req.file;
  if (file) {
    if (String(file.mimetype || '').toLowerCase() !== 'application/pdf') {
      throw AppError.badRequest('Only PDF files are accepted');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw AppError.badRequest('File too large (max 10MB)');
    }
  }

  const appointment = await ensureDoctorOwnsAppointment(req.user._id, req.params.appointmentId);
  const consultation = await ensureConsultationForAppointment(req.user._id, appointment);

  const bodyPatientId = String(req.body.patientId || '').trim();
  if (bodyPatientId && String(appointment.patientId) !== bodyPatientId) {
    throw AppError.badRequest('Patient does not match appointment');
  }

  const originalText = file ? '' : String(req.body.originalText || '').trim();
  if (!file && originalText.length < 100) {
    throw AppError.badRequest('Report too short (min 100 characters)');
  }

  consultation.set('medicalReport', {
    title: String(req.body.title || '').trim(),
    fileType: file ? 'pdf' : 'text',
    originalText,
    pdfName: file?.originalname || '',
    pdfMimeType: file?.mimetype || '',
    pdfSizeBytes: file?.size || 0,
    pdfBase64: file ? file.buffer.toString('base64') : '',
    uploadedAt: new Date(),
    summary: { status: 'Not Generated' },
  });
  consultation.markModified('medicalReport');
  await consultation.save();

  const saved = await Consultation.findById(consultation._id).lean();
  res.status(201).json({
    success: true,
    message: 'Report uploaded successfully',
    data: toConsultationBundle(saved),
  });
});

/** PUT /api/doctor/reports/:id/replace — replace the file/text of an existing report.
 *
 * Accepts multipart (reportFile) or JSON body.
 * Changing the report content always resets the AI summary to 'Not Generated'.
 * A title-only change preserves the existing summary.
 */
export const replaceConsultationReport = asyncHandler(async (req, res) => {
  const consultation = await Consultation.findOne({
    _id: req.params.id,
    doctorId: req.user._id,
  });
  if (!consultation) throw AppError.notFound('Report not found');

  const file = req.file;
  const title = String(req.body.title || '').trim();
  const originalText = String(req.body.originalText || '').trim();
  const existing = consultation.medicalReport?.toObject?.() ?? consultation.medicalReport ?? {};

  if (!title) throw AppError.badRequest('Report title is required');

  let contentChanged = false;

  if (file) {
    // ── PDF replacement ────────────────────────────────────────────────────
    if (String(file.mimetype || '').toLowerCase() !== 'application/pdf') {
      throw AppError.badRequest('Only PDF files are accepted');
    }
    if (file.size > 10 * 1024 * 1024) throw AppError.badRequest('File too large (max 10 MB)');

    applyPdfMedicalReport(consultation, file, title);
    contentChanged = true;
  } else if (originalText) {
    // ── Text replacement ───────────────────────────────────────────────────
    if (originalText.length < 10) throw AppError.badRequest('Report text is too short (min 10 characters)');

    consultation.set('medicalReport', {
      title,
      fileType: 'text',
      originalText,
      pdfName: '',
      pdfMimeType: '',
      pdfSizeBytes: 0,
      pdfBase64: '',
      uploadedAt: new Date(),
      summary: { status: 'Not Generated' },
    });
    consultation.markModified('medicalReport');
    contentChanged = true;
  } else {
    // ── Title-only update — preserve existing file and summary ─────────────
    if (title === String(existing.title || '').trim()) {
      // Nothing to change — return current state
      const unchanged = await Consultation.findById(consultation._id).lean();
      return res.json({ success: true, message: 'No changes made', data: toDoctorReportRow(unchanged) });
    }
    consultation.set('medicalReport', { ...existing, title });
    consultation.markModified('medicalReport');
  }

  await consultation.save();

  await auditLogger({
    action: contentChanged ? 'REPORT_REPLACED' : 'REPORT_TITLE_UPDATED',
    target: `Consultation:${consultation._id}`,
    targetCollection: 'consultations',
    userId: req.user._id,
    details: { title, contentChanged },
  });

  const saved = await Consultation.findById(consultation._id)
    .populate('patientId', 'name patientId patientCode')
    .lean();
  res.json({
    success: true,
    message: contentChanged ? 'Report replaced — AI summary has been reset' : 'Report title updated',
    data: toDoctorReportRow(saved),
    summaryReset: contentChanged,
  });
});

/** DELETE /api/doctor/reports/:id — permanently wipe the medical report from a consultation */
export const deleteConsultationReport = asyncHandler(async (req, res) => {
  const consultation = await Consultation.findOne({
    _id: req.params.id,
    doctorId: req.user._id,
  });
  if (!consultation) throw AppError.notFound('Report not found');
  if (!consultation.medicalReport?.title) throw AppError.notFound('No report to delete');

  consultation.set('medicalReport', null);
  consultation.markModified('medicalReport');
  await consultation.save();

  await auditLogger({
    action: 'REPORT_DELETED',
    target: `Consultation:${consultation._id}`,
    targetCollection: 'consultations',
    userId: req.user._id,
  });

  res.json({ success: true, message: 'Report deleted permanently' });
});

/** Legacy POST /api/doctor/reports — requires appointmentId */
export const uploadDoctorReport = asyncHandler(async (req, res) => {
  const rawAppointmentId = String(req.body.appointmentId || '').trim();
  if (!rawAppointmentId || rawAppointmentId === 'undefined') {
    throw AppError.badRequest('appointmentId is required to attach a report to a consultation');
  }
  req.params.appointmentId = rawAppointmentId;
  return uploadConsultationMedicalReport(req, res);
});

const fetchAiSummaryForConsultation = async (consultation) => {
  const report = consultation.medicalReport;
  const reportText = String(report.originalText || '').trim();
  if (report.fileType !== 'pdf' && reportText.split(/\s+/).filter(Boolean).length < 15) {
    throw AppError.badRequest('Report text is too short for summarization');
  }

  const [adminTerms, settingsRow] = await Promise.all([
    getMedicalTermsMapForAI(),
    SystemSettings.findOne({}).select('aiService').lean(),
  ]);
  const adminTermCount = Object.keys(adminTerms).length;
  const aiUrl = settingsRow?.aiService?.url || AI_SERVICE_URL;
  const configuredSec = Number(settingsRow?.aiService?.timeoutSeconds) || 180;
  // DistilBART single-pass on CPU; allow first cold start but cap at 5 minutes
  const timeoutMs = Math.min(Math.max(configuredSec, 180), 300) * 1000;

  const summarizePayload = {
    text: reportText,
    target_words: 200,
    admin_terms: adminTerms,
    extra_medical_terms: adminTerms,
  };

  let aiResponse;
  try {
    if (report.fileType === 'pdf') {
      const formData = new FormData();
      const buffer = Buffer.from(report.pdfBase64, 'base64');
      formData.append('file', new Blob([buffer], { type: report.pdfMimeType || 'application/pdf' }), report.pdfName || 'report.pdf');
      formData.append('target_words', '200');
      formData.append('extra_medical_terms_json', JSON.stringify(adminTerms));
      formData.append('admin_terms_json', JSON.stringify(adminTerms));
      aiResponse = await fetch(`${aiUrl}/api/summarize-pdf`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } else {
      aiResponse = await fetch(`${aiUrl}/api/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summarizePayload),
        signal: AbortSignal.timeout(timeoutMs),
      });
    }
  } catch (fetchErr) {
    const timedOut = fetchErr?.name === 'TimeoutError' || fetchErr?.name === 'AbortError';
    const message = timedOut
      ? `AI service timed out after ${timeoutMs / 1000} seconds. The report is saved — try again shortly.`
      : `AI service unavailable: ${fetchErr.message}. The report is saved — try again later.`;
    const err = new Error(message);
    err.statusCode = 503;
    throw err;
  }

  if (!aiResponse.ok) {
    const errorData = await aiResponse.json().catch(() => ({}));
    const detail = errorData.detail;
    const detailMsg = typeof detail === 'string' ? detail : JSON.stringify(detail || '');
    const err = new Error(detailMsg || 'AI service unavailable. Original report is still accessible.');
    err.statusCode = 503;
    throw err;
  }

  const aiData = await aiResponse.json();
  return { aiData, adminTermCount };
};

const applyAiSummaryToConsultation = (consultation, aiData) => {
  consultation.medicalReport.summary = {
    simplifiedSummary: aiData.summary,
    status: 'Pending Approval',
    aiModelUsed: aiData.model || 'facebook/bart-large-cnn',
    generationTimeMs: aiData.generation_ms || 0,
    generatedAtPKT: aiData.generated_at_pkt || '',
    chunksProcessed: aiData.chunks_processed || 1,
    originalWords: aiData.original_words || 0,
    summaryWords: aiData.summary_words || 0,
    replacementsMade: aiData.replacements_made || [],
    approvedBy: null,
    approvedAt: null,
    editedByDoctor: false,
  };
  consultation.markModified('medicalReport');
};

/** POST /api/doctor/consultations/:id/medical-report/summarize (id = consultation id) */
export const summarizeConsultationReport = asyncHandler(async (req, res) => {
  const consultation = await Consultation.findOne({ _id: req.params.id, doctorId: req.user._id });
  if (!consultation?.medicalReport?.title) throw AppError.notFound('Report not found');

  try {
    const { aiData, adminTermCount } = await fetchAiSummaryForConsultation(consultation);
    applyAiSummaryToConsultation(consultation, aiData);
    await consultation.save();

    const bundle = toConsultationBundle(consultation);
    return res.json({
      success: true,
      message: 'Summary generated successfully',
      data: {
        ...bundle.summary,
        adminTermsUsed: adminTermCount,
      },
    });
  } catch (err) {
    if (err.statusCode === 503) {
      return res.status(503).json({ success: false, message: err.message });
    }
    throw err;
  }
});

/** POST reject prior summary (if any) then run AI summarization again */
export const regenerateConsultationSummary = asyncHandler(async (req, res) => {
  const consultationId = String(req.params.id || '').trim();
  const consultation = await Consultation.findOne({
    _id: consultationId,
    doctorId: req.user._id,
    'medicalReport.title': { $nin: [null, ''] },
  });
  if (!consultation) throw AppError.notFound('Report not found');

  if (consultation.medicalReport.summary) {
    consultation.medicalReport.summary.status = 'Rejected';
    consultation.markModified('medicalReport');
    await consultation.save();
  }

  try {
    const { aiData, adminTermCount } = await fetchAiSummaryForConsultation(consultation);
    applyAiSummaryToConsultation(consultation, aiData);
    await consultation.save();

    const bundle = toConsultationBundle(consultation);
    return res.json({
      success: true,
      message: 'Summary regenerated successfully',
      data: {
        consultationId: consultation._id,
        ...bundle.summary,
        adminTermsUsed: adminTermCount,
      },
    });
  } catch (err) {
    if (err.statusCode === 503) {
      return res.status(503).json({ success: false, message: err.message });
    }
    throw err;
  }
});

export const summarizeDoctorReport = summarizeConsultationReport;
export const regenerateDoctorSummary = regenerateConsultationSummary;

export const approveConsultationSummary = asyncHandler(async (req, res) => {
  const consultation = await Consultation.findOne({ _id: req.params.id, doctorId: req.user._id });
  if (!consultation?.medicalReport?.title) throw AppError.notFound('Report not found');

  const summary = consultation.medicalReport.summary;
  if (!summary || summary.status === 'Not Generated') throw AppError.notFound('Summary not found');

  const editedSummary = String(req.body.editedSummary || '').trim();
  if (req.body.editedSummary !== undefined && editedSummary.length < 20) {
    throw AppError.badRequest('summaryText must be at least 20 chars if edited');
  }

  if (req.body.editedSummary !== undefined) {
    summary.simplifiedSummary = editedSummary;
    summary.editedByDoctor = true;
  }
  if (!String(summary.simplifiedSummary || '').trim()) {
    throw AppError.badRequest('Cannot approve empty summary text');
  }

  summary.status = 'Approved';
  summary.approvedBy = req.user._id;
  summary.approvedAt = new Date();
  consultation.markModified('medicalReport');
  await consultation.save();

  const [settings, patient] = await Promise.all([
    getSettings(),
    Patient.findById(consultation.patientId).select('name email').lean(),
  ]);
  sendSummaryReadyNotification(patient, consultation.medicalReport.title, settings).catch(() => {});

  res.json({ success: true, message: 'Summary approved and visible to patient', data: summary });
});

export const approveDoctorSummary = approveConsultationSummary;

export const rejectConsultationSummary = asyncHandler(async (req, res) => {
  const consultation = await Consultation.findOne({ _id: req.params.id, doctorId: req.user._id });
  if (!consultation?.medicalReport?.title) throw AppError.notFound('Report not found');

  if (!consultation.medicalReport.summary) {
    consultation.medicalReport.summary = { status: 'Rejected' };
  } else {
    consultation.medicalReport.summary.status = 'Rejected';
  }
  consultation.markModified('medicalReport');
  await consultation.save();

  res.json({ success: true, message: 'Summary rejected', data: consultation.medicalReport.summary });
});

export const rejectDoctorSummary = rejectConsultationSummary;

export const getDoctorProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId).select('-password').lean();
  if (!user) throw AppError.notFound('User not found');

  const profile = await DoctorProfile.findOne({ userId }).lean();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const doctorId = userId;
  const [
    totalConsultations,
    monthConsultations,
    totalAppointments,
    completedAppointments,
  ] = await Promise.all([
    Consultation.countDocuments({ doctorId }),
    Consultation.countDocuments({ doctorId, createdAt: { $gte: startOfMonth } }),
    Appointment.countDocuments({ doctorId }),
    Appointment.countDocuments({ doctorId, status: 'Completed' }),
  ]);

  const completionRate =
    totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0;

  const specialization = profile?.specialization || user.specialization || '';
  const qualification = profile?.qualification || user.qualification || '';

  res.json({
    success: true,
    data: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      memberSince: user.createdAt,
      specialization,
      qualification,
      bio: profile?.bio ?? '',
      isProfileComplete: profile?.isProfileComplete ?? false,
      schedule: {
        days: profile?.schedule?.days || [],
        shiftStart: profile?.schedule?.shiftStart || '',
        shiftEnd: profile?.schedule?.shiftEnd || '',
        maxPatientsPerDay: profile?.schedule?.maxPatientsPerDay ?? 20,
        consultationDurationMins: profile?.schedule?.consultationDurationMins ?? 30,
      },
      stats: {
        totalConsultations,
        monthConsultations,
        totalAppointments,
        completedAppointments,
        completionRate,
      },
    },
  });
});

export const updateDoctorProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { phone, bio } = req.body;
  const updatedFields = [];

  if (phone !== undefined) {
    const normalized = String(phone).trim();
    await User.findByIdAndUpdate(userId, { phone: normalized }, { runValidators: true });
    updatedFields.push('phone');
  }

  if (bio !== undefined) {
    const bioTrim = String(bio).trim();
    await DoctorProfile.findOneAndUpdate(
      { userId },
      { $set: { bio: bioTrim } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    updatedFields.push('bio');
  }

  if (updatedFields.length === 0) {
    return res.json({ success: true, message: 'No changes applied' });
  }

  await auditLogger({
    userId,
    action: 'DOCTOR_PROFILE_UPDATED',
    target: `User:${userId}`,
    targetCollection: 'users',
    details: { updatedFields },
    req,
  });

  res.json({ success: true, message: 'Profile updated successfully' });
});
