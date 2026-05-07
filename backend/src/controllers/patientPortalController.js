import Appointment from '../models/Appointment.js';
import DoctorProfile from '../models/DoctorProfile.js';
import Invoice from '../models/Invoice.js';
import MedicalReport from '../models/MedicalReport.js';
import Patient from '../models/Patient.js';
import Prescription from '../models/Prescription.js';
import ReportSummary from '../models/ReportSummary.js';
import User from '../models/User.js';

import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getTodayRangePKT, todayBoundsInPakistan } from '../utils/dateTime.js';
import { findPatientByUserId } from '../utils/patientLink.js';
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
  const doc = await findPatientByUserId(req.user._id);
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
    dateOfBirth,
    gender,
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
  if (dateOfBirth !== undefined) patient.dateOfBirth = new Date(dateOfBirth);
  if (gender !== undefined) patient.gender = String(gender).trim();
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

  const [upcoming, prescriptions, reports, nextAppt, lastCompleted] = await Promise.all([
    Appointment.countDocuments({ patientId: pid, date: { $gte: today }, status: 'Scheduled' }),
    Prescription.countDocuments({ patientId: pid }),
    ReportSummary.countDocuments({ patientId: pid, status: 'Approved' }),
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
  res.json({ success: true, data: { appointments: merged, pagination: paginationMeta(total, page, limit) } });
});

/** GET /api/patient/prescriptions — no clinical consultation notes */
export const listPatientPrescriptions = asyncHandler(async (req, res) => {
  const patient = await findPatientByUserId(req.user._id).select('_id').lean();
  if (!patient) throw AppError.notFound('Patient record not found');

  const { page, limit, skip } = parsePagination(req.query);

  const rows = await Prescription.find({ patientId: patient._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('patientId', 'name patientId patientCode dateOfBirth')
    .populate('doctorId', 'name email specialization qualification')
    .populate({
      path: 'consultationId',
      select: 'followUpDate appointmentId',
      populate: { path: 'appointmentId', select: 'date timeSlot status' },
    })
    .lean();

  const doctorIds = rows.map((r) => r.doctorId?._id).filter(Boolean);
  const profiles = await DoctorProfile.find({ userId: { $in: doctorIds } }).select('userId specialization qualification').lean();
  const pmap = new Map(profiles.map((p) => [String(p.userId), p]));

  const data = rows.map((r) => ({
    ...r,
    doctorProfile: pmap.get(String(r.doctorId?._id || r.doctorId)) || null,
  }));

  const total = await Prescription.countDocuments({ patientId: patient._id });
  res.json({ success: true, data: { prescriptions: data, pagination: paginationMeta(total, page, limit) } });
});

/** GET /api/patient/reports — Approved summaries only (FR37) */
export const listPatientReports = asyncHandler(async (req, res) => {
  const patient = await findPatientByUserId(req.user._id).select('_id').lean();
  if (!patient) throw AppError.notFound('Patient record not found');

  const { page, limit, skip } = parsePagination(req.query);

  const filter = { patientId: patient._id, status: 'Approved' };
  const [rows, total] = await Promise.all([
    ReportSummary.find(filter)
      .sort({ approvedAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'reportId', select: 'title fileType createdAt appointmentId' })
      .populate({ path: 'approvedBy', select: 'name' })
      .lean(),
    ReportSummary.countDocuments(filter),
  ]);

  const data = rows.map((s) => ({
    _id: s._id,
    reportId: s.reportId?._id,
    appointmentId: s.reportId?.appointmentId || null,
    title: s.reportId?.title,
    fileType: s.reportId?.fileType,
    uploadedAt: s.reportId?.createdAt,
    simplifiedSummary: s.simplifiedSummary,
    approvedAt: s.approvedAt,
    approvedByName: s.approvedBy?.name || null,
    medicalTermsExplained: [],
  }));

  res.json({ success: true, data: { reports: data, pagination: paginationMeta(total, page, limit) } });
});

/** GET /api/patient/reports/:reportId/summary */
export const getPatientReportSummary = asyncHandler(async (req, res) => {
  const patient = await findPatientByUserId(req.user._id).select('_id').lean();
  if (!patient) throw AppError.notFound('Patient record not found');

  const report = await MedicalReport.findOne({ _id: req.params.reportId, patientId: patient._id })
    .select('title createdAt doctorId')
    .lean();
  if (!report) throw AppError.notFound('Report not found');

  const summary = await ReportSummary.findOne({
    reportId: report._id,
    patientId: patient._id,
    status: 'Approved',
  }).lean();
  if (!summary) {
    throw AppError.forbidden('This summary is not yet available. Your doctor is reviewing it.');
  }

  const doctor = await User.findById(report.doctorId).select('name').lean();
  let approverName = doctor?.name;
  if (summary.approvedBy) {
    const approver = await User.findById(summary.approvedBy).select('name').lean();
    approverName = approver?.name || approverName;
  }

  res.json({
    success: true,
    data: {
      reportId: report._id,
      title: report.title,
      uploadedAt: report.createdAt,
      doctorName: doctor?.name || 'Doctor',
      simplifiedSummary: summary.simplifiedSummary,
      approvedAt: summary.approvedAt,
      approvedByName: approverName,
      medicalTermsExplained: [],
    },
  });
});

/** GET /api/patient/invoices */
export const listPatientInvoices = asyncHandler(async (req, res) => {
  const patient = await findPatientByUserId(req.user._id).select('_id').lean();
  if (!patient) throw AppError.notFound('Patient record not found');

  const { page, limit, skip } = parsePagination(req.query);
  const invQuery = { patientId: patient._id };
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
          patientId: patient._id,
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
