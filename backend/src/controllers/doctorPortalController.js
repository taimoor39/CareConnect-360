/**
 * Doctor portal API (/api/doctor/*) — scoped by JWT to the logged-in doctor.
 *
 * Medical reports: upload stores PDF or text; summarization calls the Python AI service
 * (see summarizeDoctorReport) which runs BART + medical term simplification (Mongo terms included).
 * Summaries stay Pending until the doctor approves — then patients see them in /api/patient.
 */
import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import DoctorProfile from '../models/DoctorProfile.js';
import MedicalReport from '../models/MedicalReport.js';
import Patient from '../models/Patient.js';
import Prescription from '../models/Prescription.js';
import ReportSummary from '../models/ReportSummary.js';
import User from '../models/User.js';
import auditLogger from '../utils/auditLogger.js';
import { notifyAdmins } from '../realtime/adminRealtime.js';
import { getSettings, sendEngagementEmail } from '../utils/emailService.js';
import { logEngagement, wasAlreadySentToday } from '../utils/engagementHelper.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { dayBoundsInPakistan, todayBoundsInPakistan } from '../utils/dateTime.js';
import { paginationMeta, parsePagination, searchRegex } from '../utils/query.js';
import { getMedicalTermsMapForAI } from '../utils/medicalTermsForAI.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

const sendSummaryReadyNotification = async (patient, report, settings) => {
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
      reportTitle: report?.title || 'Medical Report',
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
      message: `Summary ready notification sent for report: ${report?.title || 'Untitled'}`,
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

const summaryStatusForReport = async (reportIds) => {
  const summaries = await ReportSummary.find({ reportId: { $in: reportIds } })
    .select('reportId status')
    .lean();
  const map = new Map(summaries.map((s) => [String(s.reportId), s.status]));
  return map;
};

export const getDoctorDashboardStats = asyncHandler(async (req, res) => {
  const doctorId = req.user._id;
  const now = new Date();
  const todayBounds = todayBoundsInPakistan();
  const todayStart = todayBounds?.start || new Date();
  const todayEnd = todayBounds?.end || new Date();
  const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23, 59, 59, 999);

  const [todayCount, weekCount, upcomingCount, doctorAppointments, pendingSummaries] = await Promise.all([
    Appointment.countDocuments({ doctorId, date: { $gte: todayStart, $lte: todayEnd } }),
    Appointment.countDocuments({ doctorId, date: { $gte: weekStart, $lte: weekEnd } }),
    Appointment.countDocuments({ doctorId, date: { $gt: now }, status: { $in: ['Scheduled', 'Checked-In', 'In-Progress'] } }),
    Appointment.find({ doctorId }).select('patientId').lean(),
    ReportSummary.countDocuments({ doctorId, status: 'Pending Approval' }),
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

  const [visitHistory, reports, prescriptions] = await Promise.all([
    Appointment.find({ doctorId: req.user._id, patientId: req.params.patientId }).sort({ date: -1, timeSlot: -1 }).lean(),
    MedicalReport.find({ doctorId: req.user._id, patientId: req.params.patientId }).sort({ createdAt: -1 }).lean(),
    Prescription.find({ doctorId: req.user._id, patientId: req.params.patientId }).sort({ createdAt: -1 }).lean(),
  ]);

  const statusMap = await summaryStatusForReport(reports.map((r) => r._id));
  const reportsWithStatus = reports.map((r) => ({ ...r, summaryStatus: statusMap.get(String(r._id)) || 'Not Generated' }));

  res.json({ success: true, data: { patient, visitHistory, reports: reportsWithStatus, prescriptions } });
});

export const getDoctorConsultations = asyncHandler(async (req, res) => {
  const rows = await Consultation.find({ doctorId: req.user._id })
    .populate('appointmentId')
    .populate('patientId', 'name patientId patientCode')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: rows });
});

export const createConsultation = asyncHandler(async (req, res) => {
  const appointment = await ensureDoctorOwnsAppointment(req.user._id, req.body.appointmentId);
  const { symptoms = '', diagnosis = '', consultationNotes, followUpDate = null, isDraft = false } = req.body;

  const existing = await Consultation.findOne({ appointmentId: appointment._id });
  if (existing) throw AppError.conflict('Consultation already exists for this appointment');

  const consultation = await Consultation.create({
    appointmentId: appointment._id,
    doctorId: req.user._id,
    patientId: appointment.patientId,
    symptoms,
    diagnosis,
    consultationNotes,
    followUpDate,
    isDraft: Boolean(isDraft),
  });

  if (!isDraft) {
    if (appointment.status === 'Checked-In') appointment.status = 'In-Progress';
    else if (appointment.status === 'In-Progress') appointment.status = 'Completed';
    await appointment.save();
    notifyAdmins({ scopes: ['dashboard'], reason: 'consultation_completed' });
  }

  res.status(201).json({ success: true, data: consultation });
});

export const updateConsultation = asyncHandler(async (req, res) => {
  const consultation = await Consultation.findOne({ _id: req.params.id, doctorId: req.user._id });
  if (!consultation) throw AppError.notFound('Consultation not found');

  ['symptoms', 'diagnosis', 'consultationNotes', 'followUpDate', 'isDraft'].forEach((k) => {
    if (req.body[k] !== undefined) consultation[k] = req.body[k];
  });
  await consultation.save();

  const appointment = await Appointment.findOne({ _id: consultation.appointmentId, doctorId: req.user._id });
  if (appointment && req.body.isDraft === false) {
    if (appointment.status === 'Checked-In') appointment.status = 'In-Progress';
    else if (appointment.status === 'In-Progress') appointment.status = 'Completed';
    await appointment.save();
    notifyAdmins({ scopes: ['dashboard'], reason: 'consultation_completed' });
  }

  res.json({ success: true, data: consultation });
});

export const createPrescription = asyncHandler(async (req, res) => {
  const consultation = await Consultation.findOne({ _id: req.body.consultationId, doctorId: req.user._id }).lean();
  if (!consultation) throw AppError.forbidden('Consultation not found for this doctor');
  if (String(consultation.patientId) !== String(req.body.patientId)) {
    throw AppError.badRequest('Patient does not match consultation');
  }

  const prescription = await Prescription.create({
    consultationId: req.body.consultationId,
    doctorId: req.user._id,
    patientId: req.body.patientId,
    items: req.body.items,
  });
  res.status(201).json({ success: true, data: prescription });
});

export const getDoctorReports = asyncHandler(async (req, res) => {
  const query = { doctorId: req.user._id };
  if (req.query.patientId) query.patientId = req.query.patientId;
  const reports = await MedicalReport.find(query)
    .populate('patientId', 'name patientId patientCode')
    .sort({ createdAt: -1 })
    .lean();
  const summaries = await ReportSummary.find({ reportId: { $in: reports.map((r) => r._id) } }).lean();
  const summaryMap = new Map(summaries.map((s) => [String(s.reportId), s]));
  const data = reports.map((r) => {
    const summary = summaryMap.get(String(r._id));
    return {
      ...r,
      summaryStatus: summary?.status || 'Not Generated',
      summary: summary || null,
    };
  });
  res.json({ success: true, data });
});

export const uploadDoctorReport = asyncHandler(async (req, res) => {
  const file = req.file;
  if (file) {
    if (String(file.mimetype || '').toLowerCase() !== 'application/pdf') {
      throw AppError.badRequest('Only PDF files are accepted');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw AppError.badRequest('File too large (max 10MB)');
    }
  }

  const appointmentId = req.body.appointmentId || null;
  if (appointmentId) await ensureDoctorOwnsAppointment(req.user._id, appointmentId);

  const payload = {
    doctorId: req.user._id,
    patientId: req.body.patientId,
    appointmentId,
    title: req.body.title,
    fileType: file ? 'pdf' : 'text',
    originalText: file ? '' : String(req.body.originalText || '').trim(),
    pdfName: file?.originalname || '',
    pdfMimeType: file?.mimetype || '',
    pdfSizeBytes: file?.size || 0,
    pdfBase64: file ? file.buffer.toString('base64') : '',
  };

  if (!file && payload.originalText.length < 100) {
    throw AppError.badRequest('Report too short (min 100 characters)');
  }

  const report = await MedicalReport.create(payload);
  res.status(201).json({ success: true, message: 'Report uploaded successfully', data: report });
});

export const summarizeDoctorReport = asyncHandler(async (req, res) => {
  const report = await MedicalReport.findOne({ _id: req.params.id, doctorId: req.user._id });
  if (!report) throw AppError.notFound('Report not found');

  const extraMedicalTerms = await getMedicalTermsMapForAI();

  let aiResponse;
  if (report.fileType === 'pdf') {
    const formData = new FormData();
    const buffer = Buffer.from(report.pdfBase64, 'base64');
    formData.append('file', new Blob([buffer], { type: report.pdfMimeType || 'application/pdf' }), report.pdfName || 'report.pdf');
    formData.append('extra_medical_terms_json', JSON.stringify(extraMedicalTerms));
    aiResponse = await fetch(`${AI_SERVICE_URL}/api/summarize-pdf`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30000),
    });
  } else {
    aiResponse = await fetch(`${AI_SERVICE_URL}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: report.originalText,
        max_length: 200,
        min_length: 50,
        extra_medical_terms: extraMedicalTerms,
      }),
      signal: AbortSignal.timeout(30000),
    });
  }

  if (!aiResponse.ok) {
    return res.status(503).json({
      success: false,
      message: 'AI service unavailable. Original report is still accessible.',
    });
  }

  const aiData = await aiResponse.json();
  const summary = await ReportSummary.findOneAndUpdate(
    { reportId: report._id },
    {
      reportId: report._id,
      doctorId: req.user._id,
      patientId: report.patientId,
      originalText: report.originalText,
      simplifiedSummary: aiData.summary,
      status: 'Pending Approval',
      aiModelUsed: 'facebook/bart-large-cnn',
      generationTimeMs: aiData.generation_ms || 0,
      generatedAtPKT: aiData.generated_at_pkt || '',
      approvedBy: null,
      approvedAt: null,
      editedByDoctor: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.json({ success: true, data: summary });
});

export const approveDoctorSummary = asyncHandler(async (req, res) => {
  const report = await MedicalReport.findOne({ _id: req.params.id, doctorId: req.user._id });
  if (!report) throw AppError.notFound('Report not found');

  const summary = await ReportSummary.findOne({ _id: req.body.summaryId, reportId: report._id, doctorId: req.user._id });
  if (!summary) throw AppError.notFound('Summary not found');

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
  await summary.save();

  const [settings, patient] = await Promise.all([
    getSettings(),
    Patient.findById(report.patientId).select('name email').lean(),
  ]);
  sendSummaryReadyNotification(patient, report, settings).catch(() => {});

  res.json({ success: true, message: 'Summary approved and visible to patient', data: summary });
});

export const rejectDoctorSummary = asyncHandler(async (req, res) => {
  const report = await MedicalReport.findOne({ _id: req.params.id, doctorId: req.user._id }).lean();
  if (!report) throw AppError.notFound('Report not found');

  const summary = await ReportSummary.findOne({ reportId: report._id, doctorId: req.user._id });
  if (!summary) throw AppError.notFound('Summary not found');
  summary.status = 'Rejected';
  await summary.save();

  res.json({ success: true, message: 'Summary rejected', data: summary });
});

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
