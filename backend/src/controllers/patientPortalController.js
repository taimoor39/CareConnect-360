/**
 * Patient portal API (/api/patient/*).
 *
 * Resolves the Patient from JWT → Patient.user link; all queries must stay scoped to that record.
 * SRS FR37: patients see uploaded medical reports; AI simplified summaries only when Approved.
 */
import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import DoctorProfile from '../models/DoctorProfile.js';
import Invoice from '../models/Invoice.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import {
  patientVisibleConsultationClause,
  toPatientReportRow,
  toPrescriptionRow,
} from '../utils/consultationHelpers.js';

import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getTodayRangePKT, todayBoundsInPakistan } from '../utils/dateTime.js';
import { findPatientByUserId, resolvePatientForPortalUser } from '../utils/patientLink.js';
import { paginationMeta, parsePagination } from '../utils/query.js';

async function attachDoctorMetaForAppointments(appointments) {
  const rows = (appointments || []).map((a) => (a.toObject ? a.toObject() : a));
  const doctorIds = rows.map((r) => r.doctorId?._id || r.doctorId).filter(Boolean);
  const profiles = await DoctorProfile.find({ userId: { $in: doctorIds } })
    .select('userId specialization qualification')
    .lean();
  const map = new Map(profiles.map((p) => [String(p.userId), p]));
  return rows.map((r) => ({
    ...r,
    doctorProfile: map.get(String(r.doctorId?._id || r.doctorId || '')) || null,
  }));
}

async function requirePatientDoc(req) {
  const doc = await resolvePatientForPortalUser(req.user);
  if (!doc) throw AppError.notFound('Patient record not found');
  return doc;
}

/** GET /api/patient/profile */
export const getPatientProfile = asyncHandler(async (req, res) => {
  const patient = await findPatientByUserId(req.user._id).select('-__v').lean();
  if (!patient) throw AppError.notFound('Patient record not found');
  const user = await User.findById(req.user._id).select('name email phone').lean();
  res.json({
    success: true,
    data: {
      patient,
      user: { name: user?.name, email: user?.email, phone: user?.phone },
    },
  });
});

/** PUT /api/patient/profile */
export const updatePatientProfile = asyncHandler(async (req, res) => {
  const patient = await requirePatientDoc(req);
  const {
    firstName,
    lastName,
    phone,
    addressLine1,
    city,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelation,
  } = req.body;
  const addr = req.body.address || {};
  const ec = req.body.emergencyContact || {};

  if (firstName !== undefined) patient.firstName = String(firstName).trim();
  if (lastName !== undefined) patient.lastName = String(lastName).trim();
  if (phone !== undefined) patient.phone = String(phone).trim();
  if (patient.firstName && patient.lastName) {
    patient.name = `${patient.firstName} ${patient.lastName}`.trim();
  }

  patient.address = patient.address || {};
  const line1 = addr.line1 ?? addressLine1;
  const cityVal = addr.city ?? city;
  if (line1 !== undefined) patient.address.line1 = String(line1).trim();
  if (cityVal !== undefined) patient.address.city = String(cityVal).trim();

  patient.emergencyContact = patient.emergencyContact || {};
  const ecName = ec.name ?? emergencyContactName;
  const ecPhone = ec.phone ?? emergencyContactPhone;
  const ecRel = ec.relation ?? emergencyContactRelation;
  if (ecName !== undefined) patient.emergencyContact.name = String(ecName).trim();
  if (ecPhone !== undefined) patient.emergencyContact.phone = String(ecPhone).trim();
  if (ecRel !== undefined) patient.emergencyContact.relation = String(ecRel).trim();

  patient.updatedBy = req.user._id;
  await patient.save();

  await User.updateOne(
    { _id: req.user._id },
    {
      $set: {
        name: patient.name || `${patient.firstName} ${patient.lastName}`.trim(),
        ...(phone !== undefined ? { phone: patient.phone } : {}),
      },
    },
  );

  const lean = await Patient.findById(patient._id).select('-__v').lean();
  res.json({ success: true, data: lean, message: 'Profile updated successfully' });
});

/** GET /api/patient/dashboard-stats */
export const getPatientDashboardStats = asyncHandler(async (req, res) => {
  const patient = await findPatientByUserId(req.user._id).lean();
  if (!patient) throw AppError.notFound('Patient record not found');

  const range = getTodayRangePKT() || todayBoundsInPakistan();
  if (!range?.start) throw AppError.internal('Could not resolve today range');
  const today = range.start;
  const pid = patient._id;

  const completedApptIds = await Appointment.find({ patientId: pid, status: 'Completed' }).distinct('_id');

  const [upcoming, prescriptions, reports, nextAppt, lastCompleted] = await Promise.all([
    Appointment.countDocuments({ patientId: pid, date: { $gte: today }, status: 'Scheduled' }),
    Consultation.countDocuments({
      patientId: pid,
      'prescription.items.0': { $exists: true },
      ...patientVisibleConsultationClause(completedApptIds),
    }),
    Consultation.countDocuments({
      patientId: pid,
      'medicalReport.title': { $exists: true, $nin: [null, ''] },
      ...patientVisibleConsultationClause(completedApptIds),
    }),
    Appointment.findOne({ patientId: pid, date: { $gte: today }, status: 'Scheduled' })
      .sort({ date: 1, timeSlot: 1 })
      .populate('doctorId', 'name email qualification specialization')
      .lean(),
    Appointment.findOne({ patientId: pid, status: 'Completed' }).sort({ date: -1 }).select('date').lean(),
  ]);

  let nextAppointment = null;
  if (nextAppt) {
    const profile = await DoctorProfile.findOne({ userId: nextAppt.doctorId?._id || nextAppt.doctorId })
      .select('specialization qualification')
      .lean();
    const [row] = await attachDoctorMetaForAppointments([nextAppt]);
    nextAppointment = {
      ...row,
      doctorSpecialization: profile?.specialization || row?.doctorProfile?.specialization,
      doctorQualification: profile?.qualification || row?.doctorProfile?.qualification,
    };
  }

  const allergies = (patient.medical?.allergies || []).filter(Boolean);

  res.json({
    success: true,
    data: {
      upcoming,
      prescriptions,
      reports,
      nextAppointment,
      patientInfo: {
        name: patient.name,
        patientId: patient.patientId,
        bloodGroup: patient.bloodGroup,
        age: patient.age ?? null,
        allergies,
      },
      lastVisitDate: lastCompleted?.date || null,
      registeredAt: patient.createdAt,
      emergencyContact: patient.emergencyContact || {},
    },
  });
});

/** GET /api/patient/appointments */
export const listPatientAppointments = asyncHandler(async (req, res) => {
  const patient = await findPatientByUserId(req.user._id).select('_id').lean();
  if (!patient) throw AppError.notFound('Patient record not found');

  const { page, limit, skip } = parsePagination(req.query);
  const filter = { patientId: patient._id };
  const upcomingOnly = String(req.query.upcoming || '').toLowerCase() === 'true';
  if (upcomingOnly) {
    const range = getTodayRangePKT() || todayBoundsInPakistan();
    if (range?.start) filter.date = { $gte: range.start };
    filter.status = 'Scheduled';
  } else {
    const st = String(req.query.status || '').trim();
    if (st) filter.status = st;
  }

  const sort = upcomingOnly ? { date: 1, timeSlot: 1 } : { date: -1, timeSlot: 1 };
  const [rows, total] = await Promise.all([
    Appointment.find(filter)
      .populate('doctorId', 'name email qualification specialization')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(filter),
  ]);

  const merged = await attachDoctorMetaForAppointments(rows);
  const ids = merged.map((r) => r._id).filter(Boolean);
  const completedApptIds = merged.filter((r) => r.status === 'Completed').map((r) => r._id);
  const consultations = ids.length
    ? await Consultation.find({
        appointmentId: { $in: ids },
        patientId: patient._id,
        ...patientVisibleConsultationClause(completedApptIds),
      })
        .select('appointmentId symptoms diagnosis consultationNotes followUpDate prescription medicalReport updatedAt')
        .lean()
    : [];
  const byAppt = new Map(consultations.map((c) => [String(c.appointmentId), c]));
  const withClinical = merged.map((r) => {
    const c = byAppt.get(String(r._id));
    return {
      ...r,
      consultation: c
        ? {
            symptoms: c.symptoms || '',
            diagnosis: c.diagnosis || '',
            consultationNotes: c.consultationNotes || '',
            followUpDate: c.followUpDate || null,
            updatedAt: c.updatedAt,
            prescription: c.prescription?.items?.length ? c.prescription : null,
            medicalReport:
              c.medicalReport?.title
                ? {
                    title: c.medicalReport.title,
                    fileType: c.medicalReport.fileType,
                    summaryStatus: c.medicalReport.summary?.status || 'Not Generated',
                    simplifiedSummary:
                      c.medicalReport.summary?.status === 'Approved'
                        ? c.medicalReport.summary.simplifiedSummary
                        : '',
                    approvedAt:
                      c.medicalReport.summary?.status === 'Approved'
                        ? c.medicalReport.summary.approvedAt
                        : null,
                  }
                : null,
          }
        : null,
    };
  });

  res.json({ success: true, data: { appointments: withClinical, pagination: paginationMeta(total, page, limit) } });
});

/** GET /api/patient/prescriptions — clinical notes live on appointment.consultation (non-draft) */
export const listPatientPrescriptions = asyncHandler(async (req, res) => {
  const patient = await findPatientByUserId(req.user._id).select('_id').lean();
  if (!patient) throw AppError.notFound('Patient record not found');

  const { page, limit, skip } = parsePagination(req.query);

  const completedApptIds = await Appointment.find({ patientId: patient._id, status: 'Completed' }).distinct('_id');

  const filter = {
    patientId: patient._id,
    'prescription.items.0': { $exists: true },
    ...patientVisibleConsultationClause(completedApptIds),
  };

  const [consultRows, total] = await Promise.all([
    Consultation.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('patientId', 'name patientId patientCode dateOfBirth')
      .populate('doctorId', 'name email specialization qualification')
      .populate('appointmentId', 'date timeSlot status')
      .lean(),
    Consultation.countDocuments(filter),
  ]);

  const doctorIds = consultRows.map((r) => r.doctorId?._id || r.doctorId).filter(Boolean);
  const profiles = await DoctorProfile.find({ userId: { $in: doctorIds } }).select('userId specialization qualification').lean();
  const pmap = new Map(profiles.map((p) => [String(p.userId), p]));

  const data = consultRows.map((r) => ({
    ...toPrescriptionRow(r, { patient: r.patientId, doctor: r.doctorId, appointment: r.appointmentId }),
    doctorProfile: pmap.get(String(r.doctorId?._id || r.doctorId)) || null,
  }));
  res.json({ success: true, data: { prescriptions: data, pagination: paginationMeta(total, page, limit) } });
});

/** GET /api/patient/reports — uploaded reports; summary text only when Approved (FR37) */
export const listPatientReports = asyncHandler(async (req, res) => {
  const patient = await findPatientByUserId(req.user._id).select('_id').lean();
  if (!patient) throw AppError.notFound('Patient record not found');

  const { page, limit, skip } = parsePagination(req.query);

  const completedApptIds = await Appointment.find({ patientId: patient._id, status: 'Completed' }).distinct('_id');

  const reportFilter = {
    patientId: patient._id,
    'medicalReport.title': { $exists: true, $nin: [null, ''] },
    ...patientVisibleConsultationClause(completedApptIds),
  };

  const [rows, total] = await Promise.all([
    Consultation.find(reportFilter)
      .sort({ 'medicalReport.uploadedAt': -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('doctorId', 'name')
      .populate('medicalReport.summary.approvedBy', 'name')
      .lean(),
    Consultation.countDocuments(reportFilter),
  ]);

  const data = rows.map((c) => {
    const approvedBy = c.medicalReport?.summary?.approvedBy;
    const approvedByName =
      (typeof approvedBy === 'object' && approvedBy?.name) || null;
    return toPatientReportRow(c, {
      doctorName: c.doctorId?.name || null,
      approvedByName,
    });
  });

  res.json({ success: true, data: { reports: data, pagination: paginationMeta(total, page, limit) } });
});

/** GET /api/patient/reports/:reportId/summary — report detail; AI summary text only when Approved */
export const getPatientReportSummary = asyncHandler(async (req, res) => {
  const patient = await findPatientByUserId(req.user._id).select('_id').lean();
  if (!patient) throw AppError.notFound('Patient record not found');

  const completedApptIds = await Appointment.find({ patientId: patient._id, status: 'Completed' }).distinct('_id');

  const consultation = await Consultation.findOne({
    _id: req.params.reportId,
    patientId: patient._id,
    'medicalReport.title': { $exists: true, $nin: [null, ''] },
    ...patientVisibleConsultationClause(completedApptIds),
  })
    .select(
      'medicalReport.title medicalReport.fileType medicalReport.pdfName medicalReport.originalText medicalReport.uploadedAt medicalReport.summary doctorId appointmentId updatedAt',
    )
    .populate('medicalReport.summary.approvedBy', 'name')
    .lean();
  if (!consultation?.medicalReport?.title) throw AppError.notFound('Report not found');

  const summary = consultation.medicalReport.summary;
  const summaryStatus = summary?.status || 'Not Generated';
  const isApproved = summaryStatus === 'Approved';
  const doctor = await User.findById(consultation.doctorId).select('name').lean();
  const approverRef = summary?.approvedBy;
  const approverName =
    (typeof approverRef === 'object' && approverRef?.name) || (isApproved ? doctor?.name : null) || null;
  const isPdf = consultation.medicalReport.fileType === 'pdf';
  const isText = consultation.medicalReport.fileType === 'text';

  res.json({
    success: true,
    data: {
      reportId: consultation._id,
      consultationId: consultation._id,
      title: consultation.medicalReport.title,
      fileType: consultation.medicalReport.fileType,
      pdfName: consultation.medicalReport.pdfName || '',
      hasPdfDownload: isPdf,
      uploadedAt: consultation.medicalReport.uploadedAt || consultation.updatedAt,
      doctorName: doctor?.name || 'Doctor',
      summaryStatus,
      simplifiedSummary: isApproved ? summary?.simplifiedSummary || '' : '',
      originalText: isText ? String(consultation.medicalReport.originalText || '').trim() : '',
      approvedAt: isApproved ? summary?.approvedAt || null : null,
      approvedByName: isApproved ? approverName : null,
      medicalTermsExplained: [],
    },
  });
});

/** GET /api/patient/reports/:reportId/pdf — download uploaded PDF report */
export const downloadPatientReportPDF = asyncHandler(async (req, res) => {
  const patient = await findPatientByUserId(req.user._id).select('_id').lean();
  if (!patient) throw AppError.notFound('Patient record not found');

  const completedApptIds = await Appointment.find({ patientId: patient._id, status: 'Completed' }).distinct('_id');

  const consultation = await Consultation.findOne({
    _id: req.params.reportId,
    patientId: patient._id,
    'medicalReport.fileType': 'pdf',
    'medicalReport.title': { $exists: true, $nin: [null, ''] },
    ...patientVisibleConsultationClause(completedApptIds),
  }).select('medicalReport.title medicalReport.pdfBase64 medicalReport.pdfName medicalReport.pdfMimeType').lean();

  const pdfBase64 = consultation?.medicalReport?.pdfBase64;
  if (!consultation || !pdfBase64) throw AppError.notFound('PDF report not found');

  const buffer = Buffer.from(pdfBase64, 'base64');
  const safeTitle = String(consultation.medicalReport.title || 'medical-report')
    .trim()
    .replace(/[^\w.\-() ]+/g, '_')
    .slice(0, 80);
  const filename = consultation.medicalReport.pdfName || `${safeTitle || 'medical-report'}.pdf`;

  res.setHeader('Content-Type', consultation.medicalReport.pdfMimeType || 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
  res.send(buffer);
});

/** GET /api/patient/invoices */
export const listPatientInvoices = asyncHandler(async (req, res) => {
  const patient = await resolvePatientForPortalUser(req.user, '_id');
  if (!patient) throw AppError.notFound('Patient record not found');
  const patientId = patient._id;

  const { page, limit, skip } = parsePagination(req.query);
  const invQuery = { patientId };
  const st = String(req.query.status || '').trim();
  if (st && ['Paid', 'Unpaid', 'Partial'].includes(st)) invQuery.paymentStatus = st;

  const [invoices, total, outstandingAgg] = await Promise.all([
    Invoice.find(invQuery)
      .populate('patientId', 'name patientId phone email')
      .populate('doctorId', 'name')
      .populate('generatedBy', 'name')
      .populate('appointmentId', 'date timeSlot')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Invoice.countDocuments(invQuery),
    Invoice.aggregate([
      {
        $match: {
          patientId,
          paymentStatus: { $in: ['Unpaid', 'Partial'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $subtract: [{ $ifNull: ['$totalAmount', 0] }, { $ifNull: ['$paidAmount', 0] }] } },
        },
      },
    ]),
  ]);

  const doctorIds = invoices.map((i) => i.doctorId?._id || i.doctorId).filter(Boolean);
  const profiles = await DoctorProfile.find({ userId: { $in: doctorIds } }).select('userId specialization').lean();
  const map = new Map(profiles.map((p) => [String(p.userId), p.specialization]));
  const data = invoices.map((inv) => ({
    ...inv,
    doctorSpecialization: map.get(String(inv.doctorId?._id || inv.doctorId)) || '',
  }));

  res.json({
    success: true,
    data: {
      invoices: data,
      pagination: paginationMeta(total, page, limit),
      outstandingTotal: outstandingAgg[0]?.total || 0,
    },
  });
});
