import QRCode from 'qrcode';
import mongoose from 'mongoose';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import { v4 as uuidv4 } from 'uuid';
import { Jimp } from 'jimp';
import jsQR from 'jsqr';

import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';

import AppError from '../utils/AppError.js';
import { notifyAdmins } from '../realtime/adminRealtime.js';
import asyncHandler from '../utils/asyncHandler.js';
import { auditFromReq } from '../utils/audit.js';
import { todayBoundsInPakistan } from '../utils/dateTime.js';
import { findPatientByUserId } from '../utils/patientLink.js';
import { paginationMeta, parsePagination, searchRegex } from '../utils/query.js';
import {
  applyRoleScope,
  attachDoctorProfiles,
  autoMarkMissedAppointments,
  performAppointmentCheckIn,
  populateAndEnrich,
  startEndOfDate,
  VALID_TRANSITIONS,
} from '../services/appointmentService.js';

dayjs.extend(utc);
dayjs.extend(timezone);

// ─── Route handlers ───────────────────────────────────────────────────────

export const listAppointments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const sortBy = String(req.query.sortBy || 'date');
  const sortOrder = String(req.query.sortOrder || 'asc').toLowerCase() === 'desc' ? -1 : 1;

  if (req.user.role === 'patient') {
    const patient = await findPatientByUserId(req.user._id).select('_id').lean();
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient record not found' });
    }
    if (req.query.patientId === 'me') req.query.patientId = patient._id.toString();
  }

  let query = {};
  if (req.query.date) {
    const { start, end } = startEndOfDate(req.query.date);
    query.date = { $gte: start, $lte: end };
  }
  if (req.query.doctorId) query.doctorId = req.query.doctorId;
  if (req.query.patientId) query.patientId = req.query.patientId;
  if (req.query.status) query.status = req.query.status;
  query = await applyRoleScope(req, query);
  await autoMarkMissedAppointments(await applyRoleScope(req, {}));

  const regex = searchRegex(req.query.search);
  if (regex && req.user.role !== 'patient') {
    const matches = await Patient.find({
      $or: [{ name: regex }, { patientId: regex }, { patientCode: regex }],
    }).select('_id').lean();

    if (matches.length === 0) {
      return res.json({ success: true, data: { appointments: [], pagination: paginationMeta(0, page, limit) } });
    }
    query.patientId = { $in: matches.map((m) => m._id) };
  }

  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate('patientId', 'name patientId patientCode phone email bloodGroup dateOfBirth')
      .populate('doctorId', 'name email')
      .sort({ [sortBy]: sortOrder, timeSlot: 1 })
      .skip(skip)
      .limit(limit),
    Appointment.countDocuments(query),
  ]);

  const merged = await attachDoctorProfiles(appointments);
  res.json({ success: true, data: { appointments: merged, pagination: paginationMeta(total, page, limit) } });
});

export const getAppointmentStats = asyncHandler(async (req, res) => {
  const todayBounds = todayBoundsInPakistan();
  const today = todayBounds?.start || new Date();
  const todayEnd = todayBounds?.end || new Date();
  const scoped = await applyRoleScope(req);
  await autoMarkMissedAppointments(scoped);

  const [todayTotal, scheduled, completedToday, missedToday] = await Promise.all([
    Appointment.countDocuments({ ...scoped, date: { $gte: today, $lte: todayEnd } }),
    Appointment.countDocuments({ ...scoped, status: 'Scheduled', date: { $gte: today } }),
    Appointment.countDocuments({ ...scoped, status: 'Completed', date: { $gte: today, $lte: todayEnd } }),
    Appointment.countDocuments({ ...scoped, status: 'Missed', date: { $gte: today, $lte: todayEnd } }),
  ]);

  res.json({ success: true, data: { todayTotal, scheduled, completedToday, missedToday } });
});

export const getAppointmentById = asyncHandler(async (req, res) => {
  await autoMarkMissedAppointments(await applyRoleScope(req, {}));
  const query = await applyRoleScope(req, { _id: req.params.id });
  const appointment = await Appointment.findOne(query)
    .populate('patientId', '-__v')
    .populate('doctorId', 'name email phone qualification specialization')
    .populate('cancelledBy', 'name')
    .populate('createdBy', 'name');

  if (!appointment) throw AppError.notFound('Appointment not found');

  const [row] = await attachDoctorProfiles([appointment]);
  res.json({ success: true, data: row });
});

export const createAppointment = asyncHandler(async (req, res) => {
  const { patientId, doctorId, date, timeSlot, reasonForVisit = '', notes = '', rescheduledFrom = null } = req.body;
  const { start: dayStart, end: dayEnd } = startEndOfDate(date);
  const slotStartRaw = String(timeSlot || '').split('-')[0]?.trim() || '';
  const dayTimeFormat = /^(\d{2}:\d{2})\s?(AM|PM)$/i.test(slotStartRaw)
    ? 'YYYY-MM-DD hh:mm A'
    : 'YYYY-MM-DD HH:mm';
  const combinedDateTime = dayjs.tz(`${date} ${slotStartRaw}`, dayTimeFormat, 'Asia/Karachi');
  if (!combinedDateTime.isValid()) {
    throw AppError.badRequest('Invalid appointment date/time');
  }
  if (combinedDateTime.isBefore(dayjs().tz('Asia/Karachi'))) {
    throw AppError.badRequest('This time slot has already passed.');
  }

  const [conflict, patientConflict, patient, doctor] = await Promise.all([
    Appointment.findOne({ doctorId, date: { $gte: dayStart, $lte: dayEnd }, timeSlot, status: { $nin: ['Cancelled', 'Missed'] } }).lean(),
    Appointment.findOne({ patientId, date: { $gte: dayStart, $lte: dayEnd }, status: { $nin: ['Cancelled', 'Missed'] } }).lean(),
    Patient.findById(patientId).lean(),
    User.findById(doctorId).lean(),
  ]);

  if (conflict) throw AppError.conflict('This time slot is already booked');
  if (patientConflict) throw AppError.conflict('Patient already has an appointment on this date');

  const qrData = uuidv4();
  const qrCodeImage = await QRCode.toDataURL(qrData);
  const appointmentDate = startEndOfDate(date).start;

  const appointment = await Appointment.create({
    patientId,
    doctorId,
    date: appointmentDate,
    timeSlot,
    reasonForVisit: String(reasonForVisit || '').trim(),
    notes: String(notes || '').trim(),
    qrCode: qrData,
    qrCodeImage,
    status: 'Scheduled',
    createdBy: req.user._id,
    rescheduledFrom: mongoose.Types.ObjectId.isValid(rescheduledFrom) ? rescheduledFrom : null,
  });

  setImmediate(() => {
  });

  await auditFromReq(req, 'APPOINTMENT_CREATED', `Appointment:${appointment._id}`, { patientId, doctorId, date: appointmentDate, timeSlot });

  notifyAdmins({ scopes: ['dashboard'], reason: 'appointment_created' });

  const row = await populateAndEnrich(appointment._id);
  res.status(201).json({ success: true, data: { appointment: row, qrCodeImage } });
});

export const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw AppError.notFound('Appointment not found');

  if (req.user.role === 'doctor' && String(appointment.doctorId) !== String(req.user._id)) {
    throw AppError.forbidden();
  }

  const { status: newStatus } = req.body;
  if (['In-Progress', 'Completed'].includes(newStatus) && !['doctor', 'admin'].includes(req.user.role)) {
    throw AppError.forbidden('Only doctors can set this status');
  }
  const current = appointment.status;
  if (!VALID_TRANSITIONS[current]?.includes(newStatus)) {
    throw AppError.badRequest(`Cannot transition from ${current} to ${newStatus}`);
  }

  appointment.status = newStatus;
  if (newStatus === 'Cancelled') {
    appointment.cancellationReason = String(req.body.cancellationReason || '').trim();
    appointment.cancelledBy = req.user._id;
  }
  await appointment.save();

  await auditFromReq(req, 'APPOINTMENT_STATUS_CHANGED', `Appointment:${appointment._id}`, { from: current, to: newStatus });

  notifyAdmins({ scopes: ['dashboard'], reason: 'appointment_status' });

  const row = await populateAndEnrich(appointment._id);
  res.json({ success: true, data: row });
});

export const checkInAppointment = asyncHandler(async (req, res) => {
  const row = await performAppointmentCheckIn(req, { qrCode: req.body.qrCode });
  res.json({ success: true, data: row });
});

// POST /api/appointments/checkin/image
// Accepts a multipart "image" file containing a QR code, decodes it
// server-side and runs the same check-in pipeline. This lets receptionists
// drop a screenshot or photo of the appointment QR onto the page when the
// camera is blocked or unreliable.
export const checkInAppointmentByImage = asyncHandler(async (req, res) => {
  if (!req.file?.buffer) {
    throw AppError.badRequest('Please upload a QR image (PNG, JPG, or WebP)');
  }

  let bitmap;
  try {
    const image = await Jimp.read(req.file.buffer);
    // Slight upscale helps decode small or blurry QR screenshots.
    if (image.bitmap.width < 320 || image.bitmap.height < 320) {
      const factor = Math.ceil(320 / Math.min(image.bitmap.width, image.bitmap.height));
      image.resize({ w: image.bitmap.width * factor, h: image.bitmap.height * factor });
    }
    bitmap = image.bitmap;
  } catch {
    throw AppError.badRequest('Could not read the uploaded image');
  }

  const decoded = jsQR(
    new Uint8ClampedArray(bitmap.data),
    bitmap.width,
    bitmap.height,
    { inversionAttempts: 'attemptBoth' },
  );

  const payload = String(decoded?.data || '').trim();
  if (!payload) {
    throw AppError.badRequest('No QR code found in this image');
  }

  // Support both "raw QR token" QR codes and "appointment ID" QR codes
  // generated by older flows or admin tooling.
  const lookup = /^[a-f\d]{24}$/i.test(payload) ? { _id: payload } : { qrCode: payload };
  const row = await performAppointmentCheckIn(req, lookup);
  res.json({ success: true, data: { appointment: row, decoded: payload } });
});

export const getAppointmentsByPatient = asyncHandler(async (req, res) => {
  await autoMarkMissedAppointments(await applyRoleScope(req, {}));
  const query = await applyRoleScope(req, { patientId: req.params.patientId });
  const rows = await Appointment.find(query)
    .populate('patientId', 'name patientId patientCode phone email bloodGroup')
    .populate('doctorId', 'name email')
    .sort({ date: 1, timeSlot: 1 });
  const merged = await attachDoctorProfiles(rows);
  res.json({ success: true, data: merged });
});

export const getAppointmentsByDoctor = asyncHandler(async (req, res) => {
  if (req.user.role === 'doctor' && String(req.user._id) !== String(req.params.doctorId)) {
    throw AppError.forbidden('You are not allowed to view these appointments');
  }
  await autoMarkMissedAppointments(await applyRoleScope(req, {}));
  const query = await applyRoleScope(req, { doctorId: req.params.doctorId });
  const rows = await Appointment.find(query)
    .populate('patientId', 'name patientId patientCode phone email bloodGroup')
    .populate('doctorId', 'name email')
    .sort({ date: 1, timeSlot: 1 });
  const merged = await attachDoctorProfiles(rows);
  res.json({ success: true, data: merged });
});
