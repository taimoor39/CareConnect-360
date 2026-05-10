/**
 * Appointment domain helpers shared by HTTP controllers and cron jobs.
 *
 * - autoMarkMissedAppointments: transitions stale Scheduled rows to Missed (PKT calendar aware).
 * - performAppointmentCheckIn: validates same-day + Scheduled, notifies admins + doctor email.
 * - applyRoleScope: narrows queries for doctor vs patient JWT contexts.
 */
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

import Appointment from '../models/Appointment.js';
import DoctorProfile from '../models/DoctorProfile.js';

import { notifyAdmins } from '../realtime/adminRealtime.js';
import AppError from '../utils/AppError.js';
import { sendDoctorPatientCheckedInEmail } from '../utils/emailService.js';
import { auditFromReq } from '../utils/audit.js';
import { dayBoundsInPakistan, toPakistanISODate, todayBoundsInPakistan } from '../utils/dateTime.js';
import { findPatientByUserId } from '../utils/patientLink.js';
import { pktDayBounds } from '../utils/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export const startEndOfDate = (dateInput) => {
  const bounds = dayBoundsInPakistan(dateInput);
  if (bounds) return { start: bounds.start, end: bounds.end };
  return pktDayBounds(dateInput);
};

const parseHHMM = (value = '') => {
  const match = String(value || '').trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return { h: Number(match[1]), m: Number(match[2]) };
};

const slotEndHHMM = (timeSlot = '') => {
  const [startRaw, endRaw] = String(timeSlot || '').split('-').map((part) => String(part || '').trim());
  return endRaw || startRaw || '';
};

export const autoMarkMissedAppointments = async (scope = {}) => {
  const now = new Date();
  const todayBounds = todayBoundsInPakistan();
  const todayStart = todayBounds?.start || new Date(now.setHours(0, 0, 0, 0));
  const todayEnd = todayBounds?.end || new Date();

  await Appointment.updateMany(
    {
      ...scope,
      status: 'Scheduled',
      date: { $lt: todayStart },
    },
    {
      $set: { status: 'Missed' },
    },
  );

  const todaysScheduled = await Appointment.find({
    ...scope,
    status: 'Scheduled',
    date: { $gte: todayStart, $lte: todayEnd },
  })
    .select('_id date timeSlot')
    .lean();

  const missedIds = [];
  todaysScheduled.forEach((appointment) => {
    const hhmm = slotEndHHMM(appointment.timeSlot);
    const parsed = parseHHMM(hhmm);
    if (!parsed) return;

    const slotEnd = new Date(appointment.date);
    slotEnd.setHours(parsed.h, parsed.m, 59, 999);
    if (slotEnd.getTime() < now.getTime()) {
      missedIds.push(appointment._id);
    }
  });

  if (missedIds.length > 0) {
    await Appointment.updateMany(
      { ...scope, _id: { $in: missedIds }, status: 'Scheduled' },
      { $set: { status: 'Missed' } },
    );
  }
};

export const VALID_TRANSITIONS = {
  Scheduled: ['Checked-In', 'Cancelled'],
  'Checked-In': ['In-Progress'],
  'In-Progress': ['Completed'],
};

export const attachDoctorProfiles = async (appointments) => {
  const rows = appointments.map((r) => (r.toObject ? r.toObject() : r));
  const doctorIds = rows.map((r) => r.doctorId?._id || r.doctorId).filter(Boolean);
  const profiles = await DoctorProfile.find({ userId: { $in: doctorIds } })
    .select('userId specialization qualification schedule')
    .lean();
  const map = new Map(profiles.map((p) => [String(p.userId), p]));
  return rows.map((r) => ({
    ...r,
    doctorProfile: map.get(String(r.doctorId?._id || r.doctorId || '')) || null,
  }));
};

export const applyRoleScope = async (req, baseQuery = {}) => {
  const query = { ...baseQuery };
  if (req.user.role === 'doctor') {
    query.doctorId = req.user._id;
  } else if (req.user.role === 'patient') {
    const patient = await findPatientByUserId(req.user._id).select('_id').lean();
    query.patientId = patient ? patient._id : null;
  }
  return query;
};

export const populateAndEnrich = async (id) => {
  const populated = await Appointment.findById(id)
    .populate('patientId', 'name patientId patientCode phone email bloodGroup')
    .populate('doctorId', 'name email');
  const [row] = await attachDoctorProfiles([populated]);
  return row;
};

/** Shared check-in pipeline (QR string, manual ID, or decoded image payload). */
export const performAppointmentCheckIn = async (req, lookup) => {
  const scoped = await applyRoleScope(req);
  const appointment = await Appointment.findOne({ ...scoped, ...lookup });
  if (!appointment) throw AppError.notFound('Invalid QR code');

  if (appointment.status === 'Cancelled') throw AppError.badRequest('Appointment was cancelled');
  if (['Checked-In', 'In-Progress', 'Completed'].includes(appointment.status)) {
    throw AppError.badRequest('Patient already checked in');
  }
  if (appointment.status !== 'Scheduled') {
    throw AppError.badRequest(`Appointment already ${appointment.status}`);
  }

  const todayIso = toPakistanISODate(new Date());
  const apptIso = toPakistanISODate(appointment.date);
  if (apptIso !== todayIso) throw AppError.badRequest('This appointment is not for today');

  appointment.status = 'Checked-In';
  await appointment.save();

  await auditFromReq(req, 'PATIENT_CHECKED_IN', `Appointment:${appointment._id}`);

  notifyAdmins({ scopes: ['dashboard'], reason: 'patient_checked_in' });

  const enriched = await populateAndEnrich(appointment._id);
  const doctor = enriched?.doctorId;
  const patientDoc = enriched?.patientId;
  if (doctor?.email) {
    sendDoctorPatientCheckedInEmail({
      doctorEmail: doctor.email,
      doctorName: doctor.name,
      patientName: patientDoc?.name,
      timeSlot: appointment.timeSlot,
      clinicName: null,
    }).catch((err) => console.error('[CHECKIN EMAIL]', err?.message || err));
  }

  return enriched;
};
